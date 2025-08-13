import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface PDFGenerationOptions {
  filename?: string
  quality?: number
  format?: 'pdf' | 'png' | 'jpg'
  scale?: number
}

export interface ReportPDFData {
  reportNumber: string
  workOrder: string
  customerName: string
  suburb: string
  date: string
}

/**
 * Generates the PDF filename using the specified naming convention:
 * Work_Order_<WorkOrder>_CTR<ReportNumber>_<CustomerName>_<Suburb>_<Date>.pdf
 */
export function generatePDFFilename(data: ReportPDFData): string {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }).replace(/\//g, '_')
    } catch {
      return dateString.replace(/[/\\:*?"<>|]/g, '_')
    }
  }

  const sanitize = (text: string) => 
    text.replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()

  const parts = [
    'Work_Order',
    sanitize(data.workOrder || ''),
    `CTR${sanitize(data.reportNumber || '')}`,
    sanitize(data.customerName || ''),
    sanitize(data.suburb || ''),
    formatDate(data.date || new Date().toISOString())
  ].filter(Boolean)

  return `${parts.join('_')}.pdf`
}

/**
 * Generates PDF using browser's native print functionality (recommended)
 */
export async function generatePDFNative(
  element: HTMLElement, 
  data: ReportPDFData,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const filename = options.filename || generatePDFFilename(data)
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.')
  }

  // Clone the element content
  const clonedElement = element.cloneNode(true) as HTMLElement
  
  // Create print document with base styles and copied head styles
  const baseCss = `
    @page { size: A4; margin: 0; }
    html, body { height: 100%; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; color-adjust: exact; background: white; }
    /* Exact A4 surface with internal padding using border-box */
    .report-container { width: 210mm; height: 297mm; box-sizing: border-box; padding: 5mm; max-width: none; margin: 0 auto; box-shadow: none; break-inside: avoid; }
    img { max-width: 100%; height: auto; -webkit-print-color-adjust: exact; }
    table, .grid { page-break-inside: avoid; }
    .no-print { display: none !important; }
  `

  const head = document.head.cloneNode(true) as HTMLHeadElement
  // Remove script tags from cloned head
  Array.from(head.querySelectorAll('script')).forEach(s => s.remove())

  // Write initial HTML
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        ${head.innerHTML}
        <style>${baseCss}</style>
      </head>
      <body>
        ${clonedElement.outerHTML}
      </body>
    </html>
  `)
  
  printWindow.document.close()
  
  // Wait for images to load
  await new Promise(resolve => {
    const images = printWindow.document.images
    let loadedImages = 0
    
    if (images.length === 0) {
      resolve(void 0)
      return
    }
    
    Array.from(images).forEach(img => {
      if (img.complete) {
        loadedImages++
        if (loadedImages === images.length) resolve(void 0)
      } else {
        img.onload = img.onerror = () => {
          loadedImages++
          if (loadedImages === images.length) resolve(void 0)
        }
      }
    })
  })
  
  // Wait next tick for CSS to apply, then print
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    // Close only after print dialog opens on most browsers
    setTimeout(() => printWindow.close(), 300)
  }, 300)
}

/**
 * Generates PDF using html2canvas + jsPDF (fallback option)
 */
export async function generatePDFCanvas(
  element: HTMLElement,
  data: ReportPDFData, 
  options: PDFGenerationOptions = {}
): Promise<void> {
  const filename = options.filename || generatePDFFilename(data)
  const quality = options.quality || 2
  const scale = options.scale || 2

  try {
    // Determine pixel dimensions reliably
    const rect = element.getBoundingClientRect()
    const targetWidth = Math.ceil(rect.width)
    const targetHeight = Math.ceil(rect.height)

    // Generate canvas from HTML
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: targetWidth,
      height: targetHeight,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        // Ensure proper styling in cloned document
        const clonedElement = clonedDoc.querySelector('[data-pdf-content]') as HTMLElement
        if (clonedElement) {
          clonedElement.style.transform = 'none'
          clonedElement.style.scale = '1'
          clonedElement.classList.add('report-container')
        }
      }
    })

    // Calculate PDF dimensions (A4: 210 × 297 mm)
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Create PDF
    const pdf = new jsPDF({
      orientation: imgHeight > 297 ? 'portrait' : 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png', quality)
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

    // Handle multiple pages if content is too tall
    if (imgHeight > 297) {
      const pageHeight = 297
      let heightLeft = imgHeight
      let position = 0

      while (heightLeft >= pageHeight) {
        position = heightLeft - pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
    }

    // Download the PDF
    pdf.save(filename)
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

/**
 * Generates image export (PNG/JPG)
 */
export async function generateImageExport(
  element: HTMLElement,
  data: ReportPDFData,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const format = options.format || 'png'
  const quality = options.quality || 1
  const scale = options.scale || 2
  
  const baseFilename = generatePDFFilename(data).replace('.pdf', '')
  const filename = `${baseFilename}.${format}`

  try {
    const rect = element.getBoundingClientRect()
    const targetWidth = Math.ceil(rect.width)
    const targetHeight = Math.ceil(rect.height)

    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: targetWidth,
      height: targetHeight,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector('[data-pdf-content]') as HTMLElement
        if (clonedElement) {
          clonedElement.style.transform = 'none'
          clonedElement.style.scale = '1'
          clonedElement.classList.add('report-container')
        }
      }
    })

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to generate image')
      }
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }, `image/${format}`, quality)
  } catch (error) {
    console.error('Image generation failed:', error)
    throw new Error(`Failed to generate ${format.toUpperCase()}. Please try again.`)
  }
}

// Removed unused getComputedStylesAsCSS helper to satisfy linter

/**
 * Batch PDF generation for multiple reports
 */
export async function generateBatchPDF(
  reports: Array<{ element: HTMLElement; data: ReportPDFData }>,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const errors: string[] = []
  
  for (let i = 0; i < reports.length; i++) {
    const { element, data } = reports[i]
    try {
      await generatePDFNative(element, data, options)
      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to generate PDF for report ${data.reportNumber}:`, error)
      errors.push(`Report ${data.reportNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Some PDFs failed to generate:\n${errors.join('\n')}`)
  }
} 
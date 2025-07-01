'use client'

import React, { useRef, useState, useCallback } from 'react'
import { ReportPreview, ReportData } from './ReportPreview'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Mail, 
  Printer, 
  Eye,
  Loader2,
  CheckCircle,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  generatePDFNative, 
  generatePDFCanvas, 
  generateImageExport,
  generateBatchPDF,
  type ReportPDFData,
  type PDFGenerationOptions 
} from '@/lib/utils/pdf-generator'
import { cn } from '@/lib/utils'

interface ReportPDFModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportData: ReportData | null
  batchReports?: ReportData[]
  showEmailOption?: boolean
}

type ExportFormat = 'pdf-native' | 'pdf-canvas' | 'png' | 'jpg'
type ExportQuality = 1 | 2 | 3

export function ReportPDFModal({ 
  open, 
  onOpenChange, 
  reportData, 
  batchReports = [], 
  showEmailOption = false 
}: ReportPDFModalProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf-native')
  const [exportQuality, setExportQuality] = useState<ExportQuality>(2)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  const isBatchMode = batchReports.length > 0
  const currentReport = reportData || (batchReports.length > 0 ? batchReports[0] : null)

  const formatReportData = useCallback((data: ReportData): ReportPDFData => {
    return {
      reportNumber: data.report_number,
      workOrder: data.work_order,
      customerName: data.customer,
      suburb: data.address?.suburb || '',
      date: data.test_date
    }
  }, [])

  const generateSinglePDF = async (format: ExportFormat, quality: ExportQuality) => {
    if (!currentReport || !previewRef.current) {
      toast.error('No report data available')
      return
    }

    setIsGenerating(true)
    
    try {
      const element = previewRef.current
      const pdfData = formatReportData(currentReport)
      const options: PDFGenerationOptions = {
        quality: quality / 3,
        scale: quality
      }

      switch (format) {
        case 'pdf-native':
          await generatePDFNative(element, pdfData, options)
          toast.success('PDF generated successfully')
          break
          
        case 'pdf-canvas':
          await generatePDFCanvas(element, pdfData, options)
          toast.success('PDF generated successfully')
          break
          
        case 'png':
        case 'jpg':
          await generateImageExport(element, pdfData, { 
            ...options, 
            format: format as 'png' | 'jpg' 
          })
          toast.success(`${format.toUpperCase()} generated successfully`)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateBatchPDFs = async () => {
    if (batchReports.length === 0) {
      toast.error('No reports selected for batch generation')
      return
    }

    setIsGenerating(true)
    try {
      const reportElements = await Promise.all(
        batchReports.map(async (report) => {
          const tempContainer = document.createElement('div')
          tempContainer.style.position = 'absolute'
          tempContainer.style.left = '-9999px'
          document.body.appendChild(tempContainer)

          const reportElement = document.createElement('div')
          reportElement.innerHTML = `Report ${report.report_number}`
          tempContainer.appendChild(reportElement)

          return {
            element: reportElement,
            data: formatReportData(report)
          }
        })
      )

      await generateBatchPDF(reportElements, {
        quality: exportQuality / 3,
        scale: exportQuality
      })

      reportElements.forEach(({ element }) => {
        element.parentElement?.remove()
      })

      toast.success(`Generated ${batchReports.length} PDF files`)
    } catch (error) {
      console.error('Batch generation failed:', error)
      toast.error('Batch generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const getFormatInfo = (format: ExportFormat) => {
    switch (format) {
      case 'pdf-native':
        return {
          name: 'PDF (Native)',
          description: 'High-quality PDF using browser\'s print engine',
          icon: FileText,
          recommended: true
        }
      case 'pdf-canvas':
        return {
          name: 'PDF (Canvas)',
          description: 'PDF generated from HTML canvas',
          icon: FileText,
          recommended: false
        }
      case 'png':
        return {
          name: 'PNG Image',
          description: 'High-quality PNG image format',
          icon: ImageIcon,
          recommended: false
        }
      case 'jpg':
        return {
          name: 'JPG Image', 
          description: 'Compressed JPG image format',
          icon: ImageIcon,
          recommended: false
        }
    }
  }

  if (!currentReport) {
    return null
  }

  const formatInfo = getFormatInfo(exportFormat)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isBatchMode ? `Batch Export (${batchReports.length} reports)` : `Report #${currentReport.report_number}`}
          </DialogTitle>
          <DialogDescription>
            {isBatchMode 
              ? 'Generate PDF files for multiple reports at once'
              : 'Preview and export your report in various formats'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[300px_1fr] gap-6 h-[70vh]">
          <div className="space-y-6 overflow-y-auto">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['pdf-native', 'pdf-canvas', 'png', 'jpg'] as ExportFormat[]).map((format) => {
                    const info = getFormatInfo(format)
                    return (
                      <SelectItem key={format} value={format}>
                        <div className="flex items-center gap-2">
                          <info.icon className="h-4 w-4" />
                          <span>{info.name}</span>
                          {info.recommended && (
                            <Badge variant="secondary" className="ml-auto">
                              <Zap className="h-3 w-3 mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formatInfo.description}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Quality</Label>
              <Select value={exportQuality.toString()} onValueChange={(value) => setExportQuality(parseInt(value) as ExportQuality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Standard (Fast)</SelectItem>
                  <SelectItem value="2">High (Recommended)</SelectItem>
                  <SelectItem value="3">Ultra (Slow)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isBatchMode && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Preview</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="w-full justify-start"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? 'Exit Preview' : 'Print Preview'}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                      disabled={zoomLevel <= 0.5}
                    >
                      -
                    </Button>
                    <span className="text-sm px-2 py-1 bg-muted rounded text-center min-w-[60px]">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                      disabled={zoomLevel >= 2}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t my-4"></div>

            <div className="space-y-3">
              {isBatchMode ? (
                <Button 
                  onClick={generateBatchPDFs}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating {batchReports.length} PDFs...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate All PDFs
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => generateSinglePDF(exportFormat, exportQuality)}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export {formatInfo.name}
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={() => window.print()}
                    className="w-full"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>

                  {showEmailOption && (
                    <Button 
                      variant="outline"
                      onClick={() => toast.info('Email functionality will be integrated')}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email Report
                    </Button>
                  )}
                </>
              )}
            </div>

            {isBatchMode && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{batchReports.length} reports ready</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Each report will be exported as a separate PDF file.
                </p>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            {isBatchMode ? (
              <div className="h-full flex items-center justify-center bg-muted/30">
                <div className="text-center space-y-4">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">Batch Export Mode</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {batchReports.length} reports will be exported. Each report will be saved as a separate PDF file.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <div 
                  className={cn(
                    "transition-transform duration-200",
                    previewMode && "bg-gray-100 p-4"
                  )}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                >
                  <div ref={previewRef} data-pdf-content>
                    <ReportPreview 
                      data={currentReport} 
                      printMode={previewMode}
                      className={previewMode ? "shadow-lg" : ""}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
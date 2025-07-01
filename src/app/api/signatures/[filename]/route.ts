import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    
    // Validate filename (prevent directory traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 })
    }

    // Define signature file paths to check
    const possiblePaths = [
      // Public uploads directory
      join(process.cwd(), 'public', 'uploads', 'signatures', filename),
      // Legacy signature paths
      join(process.cwd(), 'public', 'static', 'signatures', filename),
      // Backend uploads (if accessing from old system)
      join(process.cwd(), '..', 'Backend', 'app', 'static', 'uploads', filename)
    ]

    let filePath: string | null = null
    let fileBuffer: Buffer | null = null

    // Try to find the file in possible locations
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        try {
          fileBuffer = await readFile(path)
          filePath = path
          break
        } catch (error) {
          console.warn(`Could not read file at ${path}:`, error)
          continue
        }
      }
    }

    if (!fileBuffer || !filePath) {
      return new NextResponse('Signature file not found', { status: 404 })
    }

    // Determine content type from file extension
    const extension = filename.toLowerCase().split('.').pop()
    let contentType = 'application/octet-stream'

    switch (extension) {
      case 'png':
        contentType = 'image/png'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
      case 'webp':
        contentType = 'image/webp'
        break
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': `inline; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error serving signature file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  startIndex?: number
}

export function ImageLightbox({ open, onOpenChange, images, startIndex = 0 }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => setIndex(startIndex), [startIndex])

  const clampIndex = useCallback((i: number) => {
    if (i < 0) return images.length - 1
    if (i >= images.length) return 0
    return i
  }, [images.length])

  const handleNext = useCallback(() => setIndex((i) => clampIndex(i + 1)), [clampIndex])
  const handlePrev = useCallback(() => setIndex((i) => clampIndex(i - 1)), [clampIndex])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === '+') setScale((s) => Math.min(3, s + 0.25))
      if (e.key === '-') setScale((s) => Math.max(1, s - 0.25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleNext, handlePrev])

  const startDrag = (e: React.MouseEvent) => {
    if (scale === 1) return
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }
  const onDrag = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y })
  }
  const endDrag = () => { dragRef.current = null }

  const resetZoom = () => { setScale(1); setOffset({ x: 0, y: 0 }) }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetZoom(); onOpenChange(v) }}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b bg-background">
          <div className="text-sm text-muted-foreground">{index + 1} / {images.length}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.max(1, s - 0.25))}><ZoomOut className="h-4 w-4"/></Button>
            <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.min(3, s + 0.25))}><ZoomIn className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close"><X className="h-5 w-5"/></Button>
          </div>
        </div>
        <div className="relative bg-black/90">
          <button className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/90 p-2" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/90 p-2" onClick={handleNext} aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div 
            className="relative h-[70vh] cursor-grab active:cursor-grabbing"
            onMouseDown={startDrag}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
              <Image 
                src={images[index]}
                alt={`Image ${index + 1}`}
                width={1280}
                height={720}
                className="max-h-[70vh] w-auto object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}



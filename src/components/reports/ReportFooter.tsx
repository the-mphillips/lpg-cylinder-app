'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ReportFooterProps {
  date: string
  vehicleId: string
  testerNames: string[]
  approvedSignatory?: string
  signatureFile?: string
  printMode?: boolean
}

export function ReportFooter({
  date,
  vehicleId,
  testerNames,
  approvedSignatory,
  signatureFile,
  printMode = false
}: ReportFooterProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatTesters = (testers: string[]) => {
    if (!testers || testers.length === 0) return ''
    return testers.filter(Boolean).join(', ')
  }

  return (
    <div className={cn(
      "w-full space-y-2",
      "mt-auto", // Push to bottom of container
      printMode && "print:space-y-2"
    )}>
      {/* Separator Line - moved higher */}
      <div className="border-t border-gray-400 w-full mb-4"></div>

      {/* Footer Content - 3x2 Grid with better spacing */}
      <div className="grid grid-cols-3 grid-rows-2 gap-x-8 gap-y-2 text-[12px] pt-2 leading-relaxed">
        {/* Row 1, Column 1: Date */}
        <div className="flex gap-2 items-baseline">
          <span className="font-bold">Date:</span>
          <span>{formatDate(date)}</span>
        </div>

        {/* Row 1, Column 2: Vehicle ID */}
        <div className="flex gap-2 items-baseline">
          <span className="font-bold">Vehicle ID:</span>
          <span>{vehicleId || ''}</span>
        </div>

        {/* Row 1, Column 3: Empty */}
        <div></div>

        {/* Row 2, Column 1: Testers */}
        <div className="flex gap-2 items-baseline">
          <span className="font-bold">Testers:</span>
          <span>{formatTesters(testerNames)}</span>
        </div>

        {/* Row 2, Column 2: Approved Signatory */}
        <div className="flex gap-2 items-baseline">
          <span className="font-bold">Approved Signatory:</span>
          <span>{approvedSignatory || ''}</span>
        </div>

        {/* Row 2, Column 3: Signature - absolutely positioned to align with text baseline */}
        <div className="relative">
          {signatureFile ? (
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-data/${signatureFile}`}
              alt="Authorized Signatory's signature"
              className={cn(
                "max-w-[150px] max-h-[50px] object-contain absolute bottom-0 left-0",
                printMode && "print:block"
              )}
              onError={(e) => {
                console.log(`[SIGNATURE DEBUG] Failed to load signature: ${signatureFile}`)
                console.log(`[SIGNATURE DEBUG] Full URL attempted: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-data/${signatureFile}`)
                e.currentTarget.style.display = 'none'
              }}
              onLoad={() => {
                console.log(`[SIGNATURE DEBUG] Successfully loaded signature: ${signatureFile}`)
                console.log(`[SIGNATURE DEBUG] Full URL loaded: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-data/${signatureFile}`)
              }}
            />
          ) : (
            <div className="text-gray-500 text-[10px] italic">
              No signature on file.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
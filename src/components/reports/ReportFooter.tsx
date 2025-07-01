'use client'

import React from 'react'
import Image from 'next/image'
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
      "w-full space-y-3",
      "mt-auto", // Push to bottom of container
      printMode && "print:space-y-2"
    )}>
      {/* Separator Line */}
      <div className="border-t border-gray-400 w-full"></div>

      {/* Footer Content */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-4 items-start text-[10px]">
        {/* Date */}
        <div className="font-bold">Date:</div>
        <div className="min-w-[120px]">{formatDate(date)}</div>

        {/* Vehicle ID */}
        <div className="font-bold">Vehicle ID:</div>
        <div className="min-w-[80px]">{vehicleId || ''}</div>

        {/* Signature Area */}
        <div className="row-span-2 flex flex-col items-end justify-start min-w-[120px]">
          {signatureFile ? (
            <div className="flex flex-col items-center">
              <Image
                src={`/api/signatures/${signatureFile}`}
                alt="Authorized Signatory's signature"
                width={100}
                height={30}
                className={cn(
                  "max-w-[100px] max-h-[30px] object-contain",
                  "border rounded bg-white",
                  printMode && "print:block"
                )}
                unoptimized // For signatures, we don't need Next.js optimization
              />
            </div>
          ) : (
            <div className="text-gray-500 text-[8px] italic">
              No signature on file.
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-4 items-start text-[10px]">
        {/* Testers */}
        <div className="font-bold">Testers:</div>
        <div className="min-w-[120px]">{formatTesters(testerNames)}</div>

        {/* Approved Signatory */}
        <div className="font-bold">Approved Signatory:</div>
        <div className="min-w-[80px]">{approvedSignatory || ''}</div>
      </div>
    </div>
  )
} 
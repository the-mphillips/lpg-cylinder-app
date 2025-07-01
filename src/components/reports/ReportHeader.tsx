'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ReportHeaderProps {
  reportNumber?: string
  workOrder?: string
  printMode?: boolean
}

export function ReportHeader({ printMode = false }: ReportHeaderProps) {
  return (
    <div className={cn(
      "grid grid-cols-[40.21%_22.22%_13.77%_23.78%] gap-2",
      "items-start",
      "w-full",
      printMode && "print:grid"
    )}>
      {/* BWA Logo */}
      <div className="flex justify-start items-start pt-2">
        <Image
          src="/static/BWAVIC.svg"
          alt="BWA VIC Logo"
          width={180}
          height={40}
          className={cn(
            "h-auto max-w-full",
            printMode && "print:block"
          )}
          priority
        />
      </div>

      {/* Registration Mark Text */}
      <div className={cn(
        "text-center",
        "pt-1 pl-5",
        "text-[13px] font-bold leading-tight"
      )}>
        <div className="text-[13px]">REGISTERED MARK</div>
        <div className="text-[12px] mt-1">
          SAI GLOBAL APPROVED TEST<br />
          STATION NO. 871
        </div>
      </div>

      {/* Mark Image */}
      <div className="flex justify-center items-start pt-5 pl-5">
        <Image
          src="/static/mark.jpg"
          alt="Certification Mark"
          width={60}
          height={20}
          className={cn(
            "h-auto",
            printMode && "print:block"
          )}
        />
      </div>

      {/* Company Information */}
      <div className={cn(
        "text-right",
        "leading-tight",
        "space-y-0.5"
      )}>
        <div className="text-[13px] font-bold">BWA (VIC) PTY LTD</div>
        <div className="text-[11px]">ABN: 64 246 540 757</div>
        <div className="text-[12px] font-bold">PH: 1300 292 427</div>
        <div className="text-[10px]">
          <a 
            href="mailto:ACCOUNTS@BWAVIC.COM.AU"
            className={cn(
              "text-blue-600 hover:text-blue-800 underline",
              printMode && "print:text-black print:no-underline"
            )}
          >
            ACCOUNTS@BWAVIC.COM.AU
          </a>
        </div>
        <div className="text-[12px] font-bold">PO BOX 210,</div>
        <div className="text-[12px] font-bold">BUNYIP VIC 3815</div>
      </div>
    </div>
  )
} 
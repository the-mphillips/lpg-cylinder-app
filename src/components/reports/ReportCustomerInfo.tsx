'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ReportCustomerInfoProps {
  customer: string
  address: string
  gasType: string
  gasSupplier: string
  size: string
  reportNumber: string
  workOrder: string
  printMode?: boolean
}

export function ReportCustomerInfo({
  customer,
  address,
  gasType,
  gasSupplier,
  size,
  reportNumber,
  workOrder,
  printMode = false
}: ReportCustomerInfoProps) {
  return (
    <div className={cn(
      "report-customer-info w-full space-y-1.5",
      printMode && "print:space-y-1.5"
    )}>
      {/* Customer Name Row */}
      <div className="grid grid-cols-[80px_1fr_auto] gap-4 items-center">
        <div className="text-[14px] font-bold text-black whitespace-nowrap leading-relaxed">Customer:</div>
        <div>
          <span className="text-[14px] leading-relaxed">{customer || ''}</span>
        </div>
        <div className="text-[14px] font-bold text-black text-right whitespace-nowrap leading-tight">
          CYLINDER TEST REPORT
        </div>
      </div>

      {/* Address Row */}
      <div className="grid grid-cols-[80px_1fr_auto] gap-4 items-center">
        <div className="text-[14px] font-bold text-black whitespace-nowrap leading-relaxed">Address:</div>
        <div>
          <span className="text-[14px] leading-relaxed">{address || ''}</span>
        </div>
        <div className="text-[14px] font-bold text-red-600 text-right leading-tight">
          {reportNumber || ''}
        </div>
      </div>

      {/* Gas Details Row */}
      <div className="grid grid-cols-[80px_1fr_auto] gap-4 items-center">
        <div className="text-[14px] font-bold text-black whitespace-nowrap leading-relaxed">Type:</div>
        <div className="flex gap-4 text-[14px] leading-relaxed">
          <span>{gasType || ''}</span>
          <div className="flex gap-2">
            <span className="font-bold text-black whitespace-nowrap">Gas Supplier:</span>
            <span>{gasSupplier || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-black whitespace-nowrap">Size:</span>
            <span>{size || ''}</span>
          </div>
        </div>
        <div className="text-[14px] font-bold text-black text-right whitespace-nowrap leading-tight">
          WORK ORDER
        </div>
      </div>

      {/* Work Order Row */}
      <div className="grid grid-cols-[80px_1fr_auto] gap-4 items-center">
        <div></div>
        <div></div>
        <div className="text-[14px] font-bold text-red-600 text-right leading-tight">
          {workOrder || ''}
        </div>
      </div>
    </div>
  )
} 
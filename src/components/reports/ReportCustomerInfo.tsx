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
      "w-full space-y-1",
      printMode && "print:space-y-1"
    )}>
      {/* Customer Name Row */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
        <div className="text-[14px] font-bold text-black">Customer:</div>
        <div className="border-b border-gray-300 pb-0.5">
          <span className="text-[14px] pl-3">{customer || ''}</span>
        </div>
        <div className="text-[14px] font-bold text-black text-right">
          CYLINDER TEST REPORT
        </div>
      </div>

      {/* Address Row */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
        <div className="text-[14px] font-bold text-black">Address:</div>
        <div className="border-b border-gray-300 pb-0.5">
          <span className="text-[14px] pl-3">{address || ''}</span>
        </div>
        <div className="text-[14px] font-bold text-red-600 text-right">
          {reportNumber || ''}
        </div>
      </div>

      {/* Gas Details Row */}
      <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-2 items-center">
        <div className="text-[14px] font-bold text-black">Type:</div>
        <div className="border-b border-gray-300 pb-0.5 min-w-[60px]">
          <span className="text-[14px] pl-3">{gasType || ''}</span>
        </div>
        
        <div className="text-[14px] font-bold text-black">Gas Supplier:</div>
        <div className="border-b border-gray-300 pb-0.5 min-w-[80px]">
          <span className="text-[14px] pl-3">{gasSupplier || ''}</span>
        </div>
        
        <div className="text-[14px] font-bold text-black">Size:</div>
        <div className="border-b border-gray-300 pb-0.5 min-w-[60px]">
          <span className="text-[14px] pl-3">{size || ''}</span>
        </div>
        
        <div className="text-[14px] font-bold text-black text-right">
          WORK ORDER
        </div>
      </div>

      {/* Work Order Row */}
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        <div></div>
        <div className="text-[14px] font-bold text-red-600 text-right">
          {workOrder || ''}
        </div>
      </div>
    </div>
  )
} 
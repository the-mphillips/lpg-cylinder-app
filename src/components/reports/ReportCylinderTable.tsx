'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface CylinderData {
  cylinderNo: string
  cylinderSpec: string
  wc: string
  extExam: string
  intExam: string
  barcode: string
  remarks: string
  recordedBy?: string
}

interface ReportCylinderTableProps {
  cylinderData: CylinderData[]
  printMode?: boolean
}

export function ReportCylinderTable({ cylinderData, printMode = false }: ReportCylinderTableProps) {
  const hasData = cylinderData && cylinderData.length > 0

  return (
    <div className={cn(
      "w-full border border-black",
      "print:border-black",
      printMode && "print:break-inside-avoid"
    )}>
      {/* Table Headers */}
      <div className={cn(
        "grid grid-cols-[1fr_1fr_0.5fr_0.75fr_0.75fr_1fr_1.5fr] gap-0",
        "bg-gray-200 font-bold text-[8px] text-center",
        "print:bg-gray-200"
      )}>
        <div className="border-r border-black p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">Cylinder No.</span>
        </div>
        <div className="border-r border-black p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">Cylinder<br />Specification</span>
        </div>
        <div className="border-r border-black p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">W.C. (kg)</span>
        </div>
        <div className="border-r border-black p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">Result of<br />EXT Exam</span>
        </div>
        <div className="border-r border-black p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">Result of<br />INT Exam</span>
        </div>
        <div className="border-r border-black p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">Barcode</span>
        </div>
        <div className="p-1 py-2 flex items-center justify-center">
          <span className="leading-tight">Remarks</span>
        </div>
      </div>

      {/* Table Data Rows */}
      {hasData ? (
        cylinderData.map((cylinder, index) => (
          <div
            key={index}
            className={cn(
              "grid grid-cols-[1fr_1fr_0.5fr_0.75fr_0.75fr_1fr_1.5fr] gap-0",
              "text-[8px] text-center",
              "border-t border-black",
              "print:break-inside-avoid"
            )}
          >
            <div className="border-r border-black p-1 py-2 flex items-center justify-center">
              <span className="break-words">{cylinder.cylinderNo || ''}</span>
            </div>
            <div className="border-r border-black p-1 py-2 flex items-center justify-center">
              <span className="break-words">{cylinder.cylinderSpec || ''}</span>
            </div>
            <div className="border-r border-black p-1 py-2 flex items-center justify-center">
              <span>{cylinder.wc || ''}</span>
            </div>
            <div className="border-r border-black p-1 py-2 flex items-center justify-center">
              <span className={cn(
                "font-semibold",
                cylinder.extExam === 'PASS' ? 'text-green-700' : 
                cylinder.extExam === 'FAIL' ? 'text-red-700' : '',
                printMode && "print:text-black"
              )}>
                {cylinder.extExam || ''}
              </span>
            </div>
            <div className="border-r border-black p-1 py-2 flex items-center justify-center">
              <span className={cn(
                "font-semibold",
                cylinder.intExam === 'PASS' ? 'text-green-700' : 
                cylinder.intExam === 'FAIL' ? 'text-red-700' : '',
                printMode && "print:text-black"
              )}>
                {cylinder.intExam || ''}
              </span>
            </div>
            <div className="border-r border-black p-1 py-2 flex items-center justify-center">
              <span className="break-words">{cylinder.barcode || ''}</span>
            </div>
            <div className="p-1 py-2 flex items-center justify-center">
              <span className="break-words text-left">{cylinder.remarks || '-'}</span>
            </div>
          </div>
        ))
      ) : (
        <div className={cn(
          "border-t border-black p-4 text-center text-[8px]",
          "col-span-7"
        )}>
          No cylinder data available.
        </div>
      )}

      {/* Add empty rows for minimum table height if needed */}
      {hasData && cylinderData.length < 10 && (
        Array.from({ length: Math.max(0, 10 - cylinderData.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className={cn(
              "grid grid-cols-[1fr_1fr_0.5fr_0.75fr_0.75fr_1fr_1.5fr] gap-0",
              "text-[8px] text-center",
              "border-t border-black h-8"
            )}
          >
            <div className="border-r border-black"></div>
            <div className="border-r border-black"></div>
            <div className="border-r border-black"></div>
            <div className="border-r border-black"></div>
            <div className="border-r border-black"></div>
            <div className="border-r border-black"></div>
            <div></div>
          </div>
        ))
      )}
    </div>
  )
} 
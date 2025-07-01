'use client'

import React from 'react'
import { ReportHeader } from './ReportHeader'
import { ReportCustomerInfo } from './ReportCustomerInfo'
import { ReportCylinderTable } from './ReportCylinderTable'
import { ReportFooter } from './ReportFooter'
import { cn } from '@/lib/utils'

export interface ReportData {
  id: string
  report_number: string
  work_order: string
  customer: string
  address: {
    street: string
    suburb: string
    state: string
    postcode: string
  }
  cylinder_gas_type: string
  gas_supplier: string
  size: string
  test_date: string
  tester_names: string[]
  vehicle_id: string
  approved_signatory?: string
  approved_signatory_signature?: string
  cylinder_data: Array<{
    cylinderNo: string
    cylinderSpec: string
    wc: string
    extExam: string
    intExam: string
    barcode: string
    remarks: string
    recordedBy?: string
  }>
  created_at: string
  status: string
}

interface ReportPreviewProps {
  data: ReportData
  className?: string
  printMode?: boolean
}

export function ReportPreview({ data, className, printMode = false }: ReportPreviewProps) {
  const formatAddress = () => {
    if (!data.address) return ''
    const { street, suburb, state, postcode } = data.address
    return `${street || ''}, ${suburb || ''}, ${state || ''}, ${postcode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
  }

  return (
    <div 
      className={cn(
        // Base container styles
        "bg-white font-sans text-black",
        // A4 dimensions and layout
        "w-[210mm] min-h-[297mm]",
        "p-[5mm]",
        "mx-auto",
        // Print optimizations
        printMode ? [
          "print:w-full print:h-full",
          "print:m-0 print:p-[5mm]",
          "print:shadow-none",
          "print:break-inside-avoid"
        ] : [
          "shadow-lg",
          "my-8",
          "max-w-[210mm]"
        ],
        // Typography
        "text-[10pt] leading-tight",
        // Grid layout for proper spacing
        "grid grid-rows-[auto_auto_1fr_auto]",
        "gap-4",
        className
      )}
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '10pt',
        lineHeight: '1.2'
      }}
    >
      {/* Header Section */}
      <ReportHeader 
        reportNumber={data.report_number}
        workOrder={data.work_order}
        printMode={printMode}
      />

      {/* Customer Information Section */}
      <ReportCustomerInfo
        customer={data.customer}
        address={formatAddress()}
        gasType={data.cylinder_gas_type}
        gasSupplier={data.gas_supplier}
        size={data.size}
        reportNumber={data.report_number}
        workOrder={data.work_order}
        printMode={printMode}
      />

      {/* Certification Text */}
      <div className={cn(
        "text-justify text-[8.6pt] font-bold",
        "py-2 px-1",
        "print:py-1"
      )}>
        THIS IS TO CERTIFY that the following cylinders have been tested and inspected in 
        accordance with the requirements of the SAI Global Gas Cylinder Code AS 2030 and the SAI 
        Global Code for Gas Cylinder Test Station AS 2337. Those cylinders, which have passed the 
        tests, have been stamped with the test station mark and date of test.
      </div>

      {/* Cylinder Data Table - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <ReportCylinderTable
          cylinderData={data.cylinder_data}
          printMode={printMode}
        />
      </div>

      {/* Footer Section */}
      <ReportFooter
        date={data.test_date}
        vehicleId={data.vehicle_id}
        testerNames={data.tester_names}
        approvedSignatory={data.approved_signatory}
        signatureFile={data.approved_signatory_signature}
        printMode={printMode}
      />
    </div>
  )
} 
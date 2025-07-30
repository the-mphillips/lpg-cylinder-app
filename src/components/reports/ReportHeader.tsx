'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { api } from '@/lib/trpc/client'

interface ReportHeaderProps {
  reportNumber?: string
  workOrder?: string
  printMode?: boolean
}

export function ReportHeader({ printMode = false }: ReportHeaderProps) {
  const { data: systemSettings = [] } = api.admin.getSystemSettings.useQuery()
  
  // Convert array of settings to object for easier access
  const settings = systemSettings.reduce((acc: Record<string, unknown>, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})

  // Helper to safely parse JSON values
  const getSettingValue = (key: string, defaultValue: string = '') => {
    const value = settings[key]
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value || defaultValue
  }

  // Get values from database with fallbacks
  const logoUrl = getSettingValue('logo_url') || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/app-data/branding/BWAVIC.svg`
  const markUrl = getSettingValue('mark_url') || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/app-data/branding/mark.jpg`
  const testStationText = getSettingValue('test_station_text', 'SAI GLOBAL APPROVED TEST STATION NO. 871')
  const companyAbn = getSettingValue('company_abn', '64 246 540 757')
  const companyPhone = getSettingValue('company_phone', '1300 292 427')
  const companyEmail = getSettingValue('company_email', 'ACCOUNTS@BWAVIC.COM.AU')
  const addressLine1 = getSettingValue('company_address_line1', 'PO BOX 210,')
  const addressLine2 = getSettingValue('company_address_line2', 'BUNYIP VIC 3815')

  return (
    <div className={cn(
      "grid grid-cols-[35%_25%_10%_27%] gap-2 items-start mb-1",
      "w-full",
      printMode && "print:grid"
    )}>
      {/* BWA Logo */}
      <div className="flex justify-start items-start pt-2">
        <Image
          src={logoUrl}
          alt="BWA GAS LOGO"
          width={275}
          height={50}
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
          {testStationText.split(' ').slice(0, 2).join(' ')}<br />
          {testStationText.split(' ').slice(2).join(' ')}
        </div>
      </div>

      {/* Mark Image */}
      <div className="flex justify-center items-start pt-5 pl-5">
        <Image
          src={markUrl}
          alt="Certification Mark"
          width={50}
          height={15}
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
        <div className="text-[11px]">ABN: {companyAbn}</div>
        <div className="text-[12px] font-bold">PH: {companyPhone}</div>
        <div className="text-[10px]">
          <a 
            href={`mailto:${companyEmail}`}
            className={cn(
              "text-blue-600 hover:text-blue-800 underline",
              printMode && "print:text-black print:no-underline"
            )}
          >
            {companyEmail}
          </a>
        </div>
        <div className="text-[12px] font-bold">{addressLine1}</div>
        <div className="text-[12px] font-bold">{addressLine2}</div>
      </div>
    </div>
  )
} 
'use client'

import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { columns } from "./components/columns"
import { DataTable } from "@/components/ui/data-table"
import { api } from "@/lib/trpc/client"

export default function ReportsPage() {
  const { data: reports, isLoading } = api.reports.list.useQuery()

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">LPG Test Reports</h1>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable columns={columns} data={reports || []} />
      )}
    </div>
  )
} 
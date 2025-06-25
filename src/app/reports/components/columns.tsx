"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

// This type is based on the data returned from your Supabase table
export interface Report {
  id: string
  report_number: number
  customer_name: string
  date: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  // Add any other report properties you want to display
}

export const columns: ColumnDef<Report>[] = [
  {
    accessorKey: "report_number",
    header: "Report #",
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.date)
      return date.toLocaleDateString()
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status
      const variant =
        status === "approved"
          ? "default"
          : status === "submitted"
          ? "secondary"
          : "destructive"
      return <Badge variant={variant}>{status}</Badge>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const report = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(report.id)}
            >
              Copy Report ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Report</DropdownMenuItem>
            <DropdownMenuItem>Edit Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 
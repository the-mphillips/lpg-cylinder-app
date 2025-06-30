'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Eye, 
  Edit,
  Copy,
  FileText,
  RefreshCw,
  Download,
  MoreHorizontal,
  Calendar,
  User,
  Building
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/trpc/client"

interface FilterState {
  status: string
  search: string
  dateRange: string
}

interface Report {
  id: string
  report_number: string
  customer: string
  address: {
    street?: string
    suburb?: string
    state?: string
    postcode?: string
  }
  status: string
  test_date: string
  tester_names: string[]
  approved_signatory?: string
  vehicle_id: string
  work_order?: string
  created_at: string
  updated_at: string
}

export default function ReportsPage() {
  const router = useRouter()
  const { data: reports = [], isLoading, refetch } = api.reports.list.useQuery()
  
  const [filter, setFilter] = useState<FilterState>({
    status: 'all',
    search: '',
    dateRange: 'all'
  })
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  // Filter and search logic
  const filteredReports = useMemo(() => {
    if (!Array.isArray(reports)) return []
    
    return reports.filter((report: Report) => {
      const matchesStatus = filter.status === 'all' || 
        report.status.toLowerCase() === filter.status.toLowerCase()
      
      const matchesSearch = filter.search === '' || 
        report.report_number?.toString().toLowerCase().includes(filter.search.toLowerCase()) ||
        report.customer?.toLowerCase().includes(filter.search.toLowerCase()) ||
        report.work_order?.toLowerCase().includes(filter.search.toLowerCase()) ||
        report.vehicle_id?.toLowerCase().includes(filter.search.toLowerCase())
      
      const matchesDateRange = filter.dateRange === 'all' || (() => {
        const reportDate = new Date(report.test_date)
        const now = new Date()
        
        switch (filter.dateRange) {
          case 'today':
            return reportDate.toDateString() === now.toDateString()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return reportDate >= weekAgo
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return reportDate >= monthAgo
          default:
            return true
        }
      })()
      
      return matchesStatus && matchesSearch && matchesDateRange
    })
  }, [reports, filter])

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const getVariant = (status: string) => {
      switch (status.toLowerCase()) {
        case 'approved': return 'default'
        case 'submitted': return 'secondary'
        case 'draft': return 'outline'
        case 'rejected': return 'destructive'
        default: return 'secondary'
      }
    }

    return (
      <Badge variant={getVariant(status)}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Quick view modal
  const handleQuickView = (report: Report) => {
    setSelectedReport(report)
    setQuickViewOpen(true)
  }

  // Actions
  const handleDuplicate = (report: Report) => {
    router.push(`/reports/new?duplicate=${report.id}`)
  }

  const handleViewReport = (report: Report) => {
    router.push(`/reports/${report.id}`)
  }

  const handleEditReport = (report: Report) => {
    router.push(`/reports/${report.id}/edit`)
  }

  // Stats cards
  const stats = useMemo(() => {
    const total = filteredReports.length
    const approved = filteredReports.filter(r => r.status.toLowerCase() === 'approved').length
    const pending = filteredReports.filter(r => r.status.toLowerCase() === 'submitted').length
    const draft = filteredReports.filter(r => r.status.toLowerCase() === 'draft').length
    
    return { total, approved, pending, draft }
  }, [filteredReports])

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">LPG Test Reports</h1>
          <p className="text-muted-foreground">
            Manage and view all test reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={filter.dateRange} onValueChange={(value) => setFilter({ ...filter, dateRange: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Test Date</TableHead>
                <TableHead>Vehicle ID</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tester(s)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report: Report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.report_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{report.customer}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.address?.suburb || 'N/A'}, {report.address?.state || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.test_date ? new Date(report.test_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>{report.vehicle_id || 'N/A'}</TableCell>
                  <TableCell>{report.work_order || 'N/A'}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {Array.isArray(report.tester_names) 
                      ? report.tester_names.join(', ') || 'N/A'
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleQuickView(report)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Quick View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewReport(report)}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditReport(report)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Report
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDuplicate(report)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {filter.search || filter.status !== 'all' || filter.dateRange !== 'all'
                        ? 'No reports match your filters'
                        : 'No reports found'}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick View Modal */}
      <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report #{selectedReport?.report_number}</DialogTitle>
            <DialogDescription>
              Quick view of report details
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Customer Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedReport.customer}</p>
                    <p><strong>Address:</strong> {selectedReport.address?.street || 'N/A'}</p>
                    <p><strong>Location:</strong> {selectedReport.address?.suburb || 'N/A'}, {selectedReport.address?.state || 'N/A'} {selectedReport.address?.postcode || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Test Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Test Date:</strong> {selectedReport.test_date ? new Date(selectedReport.test_date).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Vehicle ID:</strong> {selectedReport.vehicle_id}</p>
                    <p><strong>Work Order:</strong> {selectedReport.work_order || 'N/A'}</p>
                    <p><strong>Status:</strong> <StatusBadge status={selectedReport.status} /></p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personnel
                </h4>
                                  <div className="space-y-1 text-sm">
                    <p><strong>Tester(s):</strong> {
                      Array.isArray(selectedReport.tester_names) 
                        ? selectedReport.tester_names.join(', ') || 'N/A'
                        : 'N/A'
                    }</p>
                    {selectedReport.approved_signatory && (
                      <p><strong>Approved by:</strong> {selectedReport.approved_signatory}</p>
                    )}
                  </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleViewReport(selectedReport)} className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Report
                </Button>
                <Button variant="outline" onClick={() => handleEditReport(selectedReport)} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 
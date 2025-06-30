'use client'

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  Building,
  Filter,
  ChevronLeft,
  ChevronRight
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api } from "@/lib/trpc/client"

interface FilterState {
  status: string
  search: string
  dateRange: string
}

interface PaginationState {
  currentPage: number
  itemsPerPage: number
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
  const searchParams = useSearchParams()
  const { data: reports = [], isLoading, refetch } = api.reports.list.useQuery()
  
  const [filter, setFilter] = useState<FilterState>({
    status: 'all',
    search: '',
    dateRange: 'all'
  })

  // Handle URL parameters on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam && filterParam !== 'all') {
      setFilter(prev => ({ ...prev, status: filterParam }))
    }
  }, [searchParams])
  
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10
  })
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  // Filter and search logic
  const filteredReports = useMemo(() => {
    if (!Array.isArray(reports)) return []
    
    return reports.filter((report: Report) => {
      const matchesStatus = filter.status === 'all' || 
        report.status.toLowerCase() === filter.status.toLowerCase() ||
        (filter.status === 'submitted' && (report.status.toLowerCase() === 'submitted' || report.status.toLowerCase() === 'pending'))
      
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

  // Pagination logic
  const paginatedReports = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    const endIndex = startIndex + pagination.itemsPerPage
    return filteredReports.slice(startIndex, endIndex)
  }, [filteredReports, pagination])

  const totalPages = Math.ceil(filteredReports.length / pagination.itemsPerPage)

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'approved': return 'bg-green-100 text-green-800'
        case 'pending': 
        case 'submitted': return 'bg-amber-100 text-amber-800'
        case 'draft': return 'bg-gray-100 text-gray-800'
        case 'rejected': 
        case 'archived':
        case 'deleted': return 'bg-red-100 text-red-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    const displayStatus = status === 'submitted' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)

    return (
      <Badge className={getStatusColor(status)}>
        {displayStatus}
      </Badge>
    )
  }

  // Reset pagination when filters change
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter({ ...filter, ...newFilter })
    setPagination({ ...pagination, currentPage: 1 })
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

  // Tester avatars component
  const TesterAvatars = ({ testers }: { testers: string[] }) => {
    if (!Array.isArray(testers) || testers.length === 0) {
      return <span className="text-sm text-muted-foreground">N/A</span>
    }

    const getInitials = (name: string) => {
      const nameParts = name.trim().split(' ').filter(part => part.length > 0)
      if (nameParts.length >= 2) {
        // First name initial + Last name initial
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      } else if (nameParts.length === 1) {
        // Single name, take first 2 characters
        return nameParts[0].substring(0, 2).toUpperCase()
      }
      return 'NA'
    }

    const getAvatarColor = (name: string) => {
      const colors = [
        'bg-blue-700',
        'bg-green-700', 
        'bg-purple-700',
        'bg-orange-700',
        'bg-pink-700',
        'bg-indigo-700',
        'bg-red-700',
        'bg-teal-700'
      ]
      const index = name.length % colors.length
      return colors[index]
    }

    return (
      <TooltipProvider>
        <div className="flex -space-x-2">
          {testers.slice(0, 3).map((tester, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className={`text-white text-xs font-medium ${getAvatarColor(tester)}`}>
                    {getInitials(tester)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tester}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {testers.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background bg-gray-500">
                  <AvatarFallback className="text-white text-xs font-medium">
                    +{testers.length - 3}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {testers.slice(3).map((tester, index) => (
                    <p key={index}>{tester}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    )
  }

  // Stats cards - calculate from all reports, not filtered
  const stats = useMemo(() => {
    if (!Array.isArray(reports)) return { total: 0, approved: 0, pending: 0, draft: 0 }
    
    const total = reports.length
    const approved = reports.filter(r => r.status.toLowerCase() === 'approved').length
    const pending = reports.filter(r => r.status.toLowerCase() === 'submitted' || r.status.toLowerCase() === 'pending').length
    const draft = reports.filter(r => r.status.toLowerCase() === 'draft').length
    
    return { total, approved, pending, draft }
  }, [reports])

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
          <Button variant="outline" asChild>
            <Link href="/admin/archive">
              <FileText className="w-4 h-4 mr-2" />
              Archive
            </Link>
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
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105" onClick={() => handleFilterChange({ status: 'all' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105" onClick={() => handleFilterChange({ status: 'approved' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105" onClick={() => handleFilterChange({ status: 'submitted' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105" onClick={() => handleFilterChange({ status: 'draft' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={filter.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="pl-8 w-64"
            />
          </div>
          
          {/* Filter Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-dashed">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {(filter.status !== 'all' || filter.dateRange !== 'all') && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <Select value={filter.status} onValueChange={(value) => handleFilterChange({ status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Date Range</h4>
                  <Select value={filter.dateRange} onValueChange={(value) => handleFilterChange({ dateRange: value })}>
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
                
                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setFilter({ status: 'all', search: '', dateRange: 'all' })}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Export */}
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
          </span>
          
          <Select 
            value={pagination.itemsPerPage.toString()} 
            onValueChange={(value) => setPagination({ currentPage: 1, itemsPerPage: parseInt(value) })}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
              disabled={pagination.currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {pagination.currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
              disabled={pagination.currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

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
              {paginatedReports.map((report: Report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/reports/${report.id}`}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {report.report_number}
                    </Link>
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
                  <TableCell>
                    <TesterAvatars testers={report.tester_names || []} />
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
                             {paginatedReports.length === 0 && (
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

       {/* Pagination Footer */}
       {filteredReports.length > 0 && (
         <div className="flex items-center justify-center space-x-2 py-4">
           <Button
             variant="outline"
             size="sm"
             onClick={() => setPagination({ ...pagination, currentPage: 1 })}
             disabled={pagination.currentPage <= 1}
           >
             First
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
             disabled={pagination.currentPage <= 1}
           >
             <ChevronLeft className="h-4 w-4" />
           </Button>
           <span className="text-sm font-medium px-4">
             Page {pagination.currentPage} of {totalPages}
           </span>
           <Button
             variant="outline"
             size="sm"
             onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
             disabled={pagination.currentPage >= totalPages}
           >
             <ChevronRight className="h-4 w-4" />
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => setPagination({ ...pagination, currentPage: totalPages })}
             disabled={pagination.currentPage >= totalPages}
           >
             Last
           </Button>
         </div>
       )}

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
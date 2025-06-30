"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Bell,
  ClipboardList,
  Eye,
  FolderOpen,
  RefreshCw,
  CheckCircle,
  Users,
  ArrowUpDown,
  Settings,
  FileText,
  FileEdit,
  Clock,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { api } from "@/lib/trpc/client"

// Date formatting function for notifications
const formatNotificationTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  // Show relative time for recent notifications
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  
  // Show formatted date for older notifications
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
  
  return date.toLocaleDateString('en-US', options)
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

interface ReportDetails {
  id: string
  report_number: number
  status: string
  customer: string
  address: string
  gas_type: string
  test_date: string
  tester_names: string
  approved_signatory: string | null
  vehicle_id: string
  work_order: string | null
  formatted_date: string
  status_display: string
}

interface ReportData {
  id: string
  report_number?: number
  customer?: string
  status: string
  status_display: string
  formatted_date: string
  created_at: string
  vehicle_id?: string | null
  work_order?: string | null
  tester_names?: string[] | null
  [key: string]: unknown
}

interface NotificationData {
  type: string
  message: string
  timestamp: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' })
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [showCharts, setShowCharts] = useState(false)

  const { 
    data, 
    isLoading, 
    refetch 
  } = api.dashboard.getDashboardStats.useQuery(undefined, {
    refetchInterval: 300000, // Refresh every 5 minutes
  })

  const getReportDetailsMutation = api.dashboard.getReportDetails.useMutation()

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleQuickView = async (report: ReportData) => {
    try {
      const result = await getReportDetailsMutation.mutateAsync({ id: report.id })
      
      // Ensure all fields are properly formatted for display
      const safeReport: ReportDetails = {
        ...result,
        address: typeof result.address === 'string' 
          ? result.address 
          : typeof result.address === 'object' && result.address
            ? Object.values(result.address).filter(Boolean).join(', ')
            : 'N/A',
        tester_names: Array.isArray(result.tester_names) 
          ? result.tester_names.join(', ')
          : typeof result.tester_names === 'string'
            ? result.tester_names
            : 'N/A',
        gas_type: typeof result.gas_type === 'string' ? result.gas_type : 'N/A',
        vehicle_id: typeof result.vehicle_id === 'string' ? result.vehicle_id : 'N/A',
        work_order: typeof result.work_order === 'string' ? result.work_order : null,
        approved_signatory: typeof result.approved_signatory === 'string' ? result.approved_signatory : null,
        customer: typeof result.customer === 'string' ? result.customer : 'N/A',
        test_date: typeof result.test_date === 'string' ? result.test_date : '',
        formatted_date: typeof result.formatted_date === 'string' ? result.formatted_date : '',
        status_display: typeof result.status_display === 'string' ? result.status_display : result.status || 'Unknown'
      }
      
      setSelectedReport(safeReport)
      setIsQuickViewOpen(true)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to fetch report information. Please try again."
      toast.error("Failed to load report details", {
        description: errorMessage
      })
      
      // Fallback to basic report data if detailed fetch fails
      const fallbackReport: ReportDetails = {
        id: report.id,
        report_number: report.report_number || 0,
        status: report.status,
        customer: report.customer || 'N/A',
        address: 'N/A',
        gas_type: 'N/A',
        test_date: report.created_at,
        tester_names: 'N/A',
        approved_signatory: null,
        vehicle_id: 'N/A',
        work_order: null,
        formatted_date: report.formatted_date,
        status_display: report.status_display
      }
      setSelectedReport(fallbackReport)
      setIsQuickViewOpen(true)
    }
  }

  const handleStatClick = (status: string) => {
    const filterMap = {
      'total': 'all',
      'pending': 'submitted',
      'approved': 'approved',
      'draft': 'draft',
      'rejected': 'rejected'
    }
    router.push(`/reports?filter=${filterMap[status as keyof typeof filterMap] || status}`)
  }

  const getQuickActions = () => {
    const actions = [
      { 
        label: 'Create New Report', 
        icon: <ClipboardList className="h-4 w-4" />, 
        action: () => router.push('/reports/new') 
      },
    ]
    
    if (data?.user?.role === 'Admin' || data?.user?.role === 'Super Admin') {
      actions.push({ 
        label: 'Settings', 
        icon: <Settings className="h-4 w-4" />, 
        action: () => router.push('/settings') 
      })
    }
    
    return actions
  }

  const sortedReports = data?.recentReports ? [...data.recentReports].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof typeof a]
    const bValue = b[sortConfig.key as keyof typeof b]
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  }) : []

  // Status badge styling functions to match reports page
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

  const getStatusDisplay = (status: string) => {
    return status === 'submitted' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 rounded-lg shadow-md border">
          <p className="text-sm font-semibold">{`Date: ${label}`}</p>
          <p className="text-sm text-primary">{`Reports: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const { user, reportStatistics, userStatistics, notifications, completionRate } = data || {}

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Welcome and Quick Actions */}
        <Card>
          <CardHeader className="pb-0 pt-6 relative">
            <CardTitle className="text-xl">Welcome, {user?.full_name}!</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                refetch()
                toast.success("Dashboard refreshed")
              }} 
              className="absolute top-6 right-6 h-8 w-8 p-0"
              title="Refresh dashboard data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <p className="mb-4 text-muted-foreground">This is your dashboard. Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {getQuickActions().map((action, index) => (
                <Button key={index} onClick={action.action} className="gap-2">
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-l-4 border-l-blue-500" onClick={() => handleStatClick('total')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{reportStatistics?.total || 0}</div>
              <p className="text-xs text-muted-foreground">All reports in the system</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-l-4 border-l-amber-500" onClick={() => handleStatClick('pending')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{reportStatistics?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Reports awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-l-4 border-l-green-500" onClick={() => handleStatClick('approved')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Reports</CardTitle>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{reportStatistics?.approved || 0}</div>
              <p className="text-xs text-muted-foreground">Reports that are fully approved</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-l-4 border-l-purple-500" onClick={() => handleStatClick('draft')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Reports</CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileEdit className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{reportStatistics?.draft || 0}</div>
              <p className="text-xs text-muted-foreground">Reports currently in draft state</p>
            </CardContent>
          </Card>
        </div>

        {/* User Stats and Notifications - 2 Column Layout */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          {/* User Statistics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>User Statistics</CardTitle>
                  <CardDescription>System user metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {userStatistics ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-indigo-600">{userStatistics.total}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">{userStatistics.admins}</div>
                    <div className="text-sm text-muted-foreground">Signatories</div>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">{userStatistics.regularUsers}</div>
                    <div className="text-sm text-muted-foreground">Testers</div>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">{userStatistics.active}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Profile Completion</span>
                    <span className="font-bold">{completionRate || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${completionRate || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Chart Toggle */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Show Analytics</span>
                  <Switch 
                    checked={showCharts} 
                    onCheckedChange={setShowCharts}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Bell className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Recent system updates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {notifications.slice(0, 5).map((notification: NotificationData, index: number) => (
                    <div key={index} className="rounded-lg p-3 border-l-4 border-emerald-400 shadow-sm">
                      <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                      <p className="text-xs text-emerald-600 mt-1">{formatNotificationTime(notification.timestamp)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-3 rounded-lg inline-block">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Chart */}
        {showCharts && data?.reportTrend && data.reportTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Report Analytics</CardTitle>
              <CardDescription>Monthly report submission trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.reportTrend}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="formatted_date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between relative">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Latest reports in the system (showing up to 10)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="h-8 w-8 p-0"
                title="Refresh reports data"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button asChild>
                <Link href="/reports/new">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  New Report
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('report_number')}
                  >
                    <div className="flex items-center gap-1">
                      Report #
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-1">
                      Customer
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Test Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Tester(s)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedReports.slice(0, 10).map((report: ReportData) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/reports/${report.id}`}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        {report.report_number || `#${report.id.slice(0, 8)}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.customer || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {/* Basic location info if available */}
                          Recent Report
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{report.formatted_date}</TableCell>
                    <TableCell className="text-sm">{report.vehicle_id || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{report.work_order || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusDisplay(report.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.tester_names && Array.isArray(report.tester_names) && report.tester_names.length > 0 ? (
                        <TooltipProvider>
                          <div className="flex -space-x-2">
                            {report.tester_names.slice(0, 3).map((tester: string, idx: number) => {
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
                                 return colors[name.length % colors.length]
                               }
                              
                              return (
                                                                 <Tooltip key={idx}>
                                   <TooltipTrigger>
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
                              )
                            })}
                            {report.tester_names.length > 3 && (
                              <div className="h-8 w-8 bg-gray-200 border-2 border-background rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">+{report.tester_names.length - 3}</span>
                              </div>
                            )}
                          </div>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleQuickView(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/reports/${report.id}`}>
                            <FolderOpen className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">No reports found</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min(sortedReports.length, 10)} of {sortedReports.length} recent reports
              </span>
              <Button asChild>
                <Link href="/reports">View All Reports</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick View Modal */}
        <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Quick View</DialogTitle>
              <DialogDescription>
                Quick overview of report details
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem 
                    label="Report Number" 
                    value={selectedReport.report_number?.toString() || `#${selectedReport.id.slice(0, 8)}`} 
                  />
                  <InfoItem 
                    label="Work Order" 
                    value={selectedReport.work_order || 'N/A'} 
                  />
                </div>
                <InfoItem 
                  label="Customer Name" 
                  value={selectedReport.customer || 'N/A'} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem 
                    label="Date" 
                    value={selectedReport.formatted_date} 
                  />
                  <InfoItem
                    label="Status"
                    value={
                      <Badge variant={
                        selectedReport.status === 'approved' ? 'default' : 
                        selectedReport.status === 'submitted' ? 'secondary' : 
                        selectedReport.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {selectedReport.status_display}
                      </Badge>
                    }
                  />
                </div>
                <InfoItem 
                  label="Address" 
                  value={selectedReport.address} 
                />
                <InfoItem 
                  label="Testers" 
                  value={selectedReport.tester_names} 
                />
                <InfoItem 
                  label="Approved Signatory" 
                  value={selectedReport.approved_signatory || 'Pending'} 
                />
                <InfoItem 
                  label="Vehicle ID" 
                  value={selectedReport.vehicle_id || 'N/A'} 
                />
                <InfoItem 
                  label="Gas Type" 
                  value={selectedReport.gas_type || 'N/A'} 
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuickViewOpen(false)}>
                Close
              </Button>
              <Button asChild>
                <Link href={`/reports/${selectedReport?.id}`}>
                  Open Report
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

interface InfoItemProps {
  label: string
  value: React.ReactNode
}

const InfoItem = ({ label, value }: InfoItemProps) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-semibold">
      {typeof value === 'string' || typeof value === 'number' 
        ? value 
        : React.isValidElement(value) 
          ? value 
          : JSON.stringify(value)
      }
    </p>
  </div>
)


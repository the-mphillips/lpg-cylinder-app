"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  Bell,
  ClipboardList,
  Eye,
  FolderOpen,
  HourglassIcon,
  RefreshCw,
  CheckCircle,
  Users,
  ArrowUpDown,
  Settings,
} from "lucide-react"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
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
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { api } from "@/lib/trpc/client"

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
  [key: string]: unknown
}

interface NotificationData {
  type: 'info' | 'warning' | 'error'
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

  const { 
    refetch: refetchReportDetails 
  } = api.dashboard.getReportDetails.useQuery(
    { id: selectedReport?.id || '' },
    { 
      enabled: false // We'll trigger this manually
    }
  )

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleQuickView = async (report: ReportData) => {
    try {
      const result = await refetchReportDetails()
      if (result.data) {
        setSelectedReport(result.data)
        setIsQuickViewOpen(true)
      }
    } catch (error) {
      console.error('Failed to fetch report details:', error)
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
          <CardHeader className="pb-0 pt-6">
            <CardTitle className="text-xl">Welcome, {user?.full_name}!</CardTitle>
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
              <Button 
                variant="outline" 
                onClick={() => refetch()} 
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('total')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportStatistics?.total || 0}</div>
              <p className="text-xs text-muted-foreground">All reports in the system</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('pending')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <HourglassIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportStatistics?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Reports awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('approved')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Reports</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportStatistics?.approved || 0}</div>
              <p className="text-xs text-muted-foreground">Reports that are fully approved</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('draft')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Reports</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportStatistics?.draft || 0}</div>
              <p className="text-xs text-muted-foreground">Reports currently in draft state</p>
            </CardContent>
          </Card>
        </div>

        {/* User Statistics for Admins */}
        {userStatistics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStatistics.total}</div>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStatistics.admins}</div>
                  <p className="text-xs text-muted-foreground">Administrators</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStatistics.regularUsers}</div>
                  <p className="text-xs text-muted-foreground">Regular Users</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStatistics.active}</div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Rate and Chart Toggle */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Completion Rate</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Show Charts</span>
              <Switch 
                checked={showCharts} 
                onCheckedChange={setShowCharts}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Progress value={completionRate} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {completionRate}% of reports approved
                </p>
              </div>
              
              {showCharts && data?.reportTrend && data.reportTrend.length > 0 && (
                <div className="h-64 mt-4">
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
                      <Tooltip content={<CustomTooltip />} />
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification: NotificationData, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Bell className={`h-4 w-4 ${
                      notification.type === 'warning' ? 'text-yellow-500' : 
                      notification.type === 'error' ? 'text-red-500' : 'text-blue-500'
                    }`} />
                    <span className="text-sm">{notification.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No new notifications</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Latest reports in the system</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('report_number')}
                  >
                    <div className="flex items-center gap-1">
                      Report Number
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-1">
                      Customer Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedReports.map((report: ReportData) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.report_number || `#${report.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>{report.customer || 'N/A'}</TableCell>
                    <TableCell>{report.formatted_date}</TableCell>
                    <TableCell>
                      <Badge variant={
                        report.status === 'approved' ? 'default' : 
                        report.status === 'submitted' ? 'secondary' : 
                        report.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {report.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
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
                  value={selectedReport.address || 'N/A'} 
                />
                <InfoItem 
                  label="Testers" 
                  value={selectedReport.tester_names || 'N/A'} 
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
    <p className="font-semibold">{value}</p>
  </div>
)
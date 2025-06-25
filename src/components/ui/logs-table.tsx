'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Globe, 
  Search, 
  Download, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Activity,
  Shield,
  FileText,
  Settings,
  Upload,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface LogEntry {
  id: string
  created_at: string
  user_id?: string
  user_email?: string
  user_name?: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: string
  ip_address?: string
  user_agent?: string
  level?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message?: string | object
  module?: string
}

interface LogsTableProps {
  logs: LogEntry[]
  isLoading?: boolean
  title: string
  type: 'system' | 'activity' | 'email'
  onRefresh?: () => void
}

// Action type mapping for icons and colors
const ACTION_CONFIG = {
  'LOGIN': { icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50' },
  'LOGOUT': { icon: Shield, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  'SETTINGS_UPDATE': { icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'FILE_UPLOAD': { icon: Upload, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'FILE_DELETE': { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50' },
  'USER_CREATE': { icon: User, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  'USER_UPDATE': { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'USER_DELETE': { icon: User, color: 'text-red-600', bgColor: 'bg-red-50' },
  'REPORT_CREATE': { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' },
  'REPORT_UPDATE': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'REPORT_DELETE': { icon: FileText, color: 'text-red-600', bgColor: 'bg-red-50' },
  'REPORT_APPROVE': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  'EMAIL_SEND': { icon: Mail, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'PASSWORD_CHANGE': { icon: Shield, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  'PROFILE_UPDATE': { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50' },
} as const

// Log level mapping for system logs
const LEVEL_CONFIG = {
  'DEBUG': { icon: Info, color: 'text-gray-600', variant: 'secondary' as const },
  'INFO': { icon: Info, color: 'text-blue-600', variant: 'default' as const },
  'WARNING': { icon: AlertTriangle, color: 'text-yellow-600', variant: 'default' as const },
  'ERROR': { icon: AlertCircle, color: 'text-red-600', variant: 'destructive' as const },
  'CRITICAL': { icon: AlertCircle, color: 'text-red-700', variant: 'destructive' as const }
}

export function LogsTable({ logs, isLoading, title, type, onRefresh }: LogsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10



  // Helper function to safely render any value as string
  const safeRender = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }



  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action).filter(Boolean))
    return Array.from(actions).sort()
  }, [logs])

  // Get unique levels for filter
  const uniqueLevels = useMemo(() => {
    const levels = new Set(logs.map(log => log.level).filter(Boolean))
    return Array.from(levels).sort()
  }, [logs])

  // Filter and paginate logs
  const filteredLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeRender(log.message).toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesLevel = levelFilter === 'all' || log.level === levelFilter
      const matchesAction = actionFilter === 'all' || log.action === actionFilter

      return matchesSearch && matchesLevel && matchesAction
    })

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [logs, searchTerm, levelFilter, actionFilter])

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown time'
    }
  }

  // Format absolute time
  const formatAbsoluteTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return 'Invalid date'
    }
  }

  // Render action badge with icon
  const renderActionBadge = (action: string) => {
    const config = ACTION_CONFIG[action as keyof typeof ACTION_CONFIG]
    if (!config) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {action}
        </Badge>
      )
    }

    const IconComponent = config.icon
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${config.bgColor} border-0`}>
        <IconComponent className={`w-3 h-3 ${config.color}`} />
        <span className={config.color}>{action.replace('_', ' ')}</span>
      </Badge>
    )
  }

  // Render level badge for system logs
  const renderLevelBadge = (level: string) => {
    const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG]
    if (!config) {
      return <Badge variant="outline">{level}</Badge>
    }

    const IconComponent = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {level}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {type === 'system' && uniqueLevels.length > 0 && (
            <div className="min-w-32">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {uniqueLevels.map(level => (
                    <SelectItem key={level} value={level || ''}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'activity' && uniqueActions.length > 0 && (
            <div className="min-w-40">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {paginatedLogs.length} of {filteredLogs.length} logs
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {type === 'system' ? (
                  <>
                    <TableHead className="w-24">Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-32">Module</TableHead>
                    <TableHead className="w-40">Time</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="w-12">User</TableHead>
                    <TableHead className="w-40">Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-12">IP</TableHead>
                    <TableHead className="w-40">Time</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={type === 'system' ? 4 : 5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={type === 'system' ? 4 : 5} className="text-center py-8 text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    {type === 'system' ? (
                      <>
                        <TableCell>{log.level && renderLevelBadge(log.level)}</TableCell>
                        <TableCell className="max-w-96">
                          <div className="truncate" title={(() => {
                              const messageValue = log.message
                              if (messageValue === null || messageValue === undefined) return 'No message'
                              if (typeof messageValue === 'string') return messageValue
                              if (typeof messageValue === 'number') return String(messageValue)
                              if (typeof messageValue === 'boolean') return String(messageValue)
                              return JSON.stringify(messageValue)
                            })()}>
                            {(() => {
                              const messageValue = log.message
                              if (messageValue === null || messageValue === undefined) return 'No message'
                              if (typeof messageValue === 'string') return messageValue
                              if (typeof messageValue === 'number') return String(messageValue)
                              if (typeof messageValue === 'boolean') return String(messageValue)
                              return JSON.stringify(messageValue)
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.module && (
                            <Badge variant="outline" className="text-xs">
                              {log.module}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div 
                            className="text-sm text-muted-foreground cursor-help" 
                            title={formatAbsoluteTime(log.created_at)}
                          >
                            {formatRelativeTime(log.created_at)}
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          {log.user_email && (
                            <div title={`${log.user_name || ''}\n${log.user_email || ''}`}>
                              <Avatar className="h-8 w-8 cursor-help">
                                <AvatarImage src="" alt="" />
                                <AvatarFallback className="text-xs">
                                  {String(getUserInitials(log.user_name, log.user_email))}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{renderActionBadge(String(log.action || ''))}</TableCell>
                        <TableCell className="max-w-96">
                          <div className="truncate" title={String(log.details || '')}>
                            {String(log.details || '-')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.ip_address && (
                            <div title={`IP: ${log.ip_address}${log.user_agent ? '\nUser Agent: ' + log.user_agent : ''}`}>
                              <Globe className="h-4 w-4 text-muted-foreground cursor-help" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div 
                            className="text-sm text-muted-foreground cursor-help" 
                            title={formatAbsoluteTime(log.created_at)}
                          >
                            {formatRelativeTime(log.created_at)}
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
"use client"

import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { 
  Globe, 
  User, 
  Clock, 
  Filter, 
  Search, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  XCircle, 
  Zap,
  Mail,
  Settings,
  FileText,
  Shield,
  Database,
  Activity,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// Types for the unified audit log system
export interface UnifiedLogEntry {
  id: string
  created_at: string
  log_type: 'system' | 'user_activity' | 'email' | 'auth' | 'security' | 'api' | 'file_operation'
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  action: string
  message: string
  
  // User information (populated from view)
  user_id?: string | null
  user_email?: string | null
  user_name?: string | null
  user_role?: string | null
  full_name?: string | null
  avatar_url?: string | null
  
  // Network information
  ip_address?: string | null
  user_agent?: string | null
  request_method?: string | null
  request_path?: string | null
  
  // Resource information
  resource_type?: string | null
  resource_id?: string | null
  resource_name?: string | null
  
  // Event details (JSON)
  details?: Record<string, any> | null
  
  // Additional metadata
  module?: string | null
  correlation_id?: string | null
  is_sensitive?: boolean
  is_system_generated?: boolean
}

interface UnifiedLogsTableProps {
  logs: UnifiedLogEntry[]
  isLoading?: boolean
  onRefresh?: () => void
  title?: string
}

// Icon mapping for log types
const LOG_TYPE_ICONS = {
  system: Database,
  user_activity: Activity,
  email: Mail,
  auth: Shield,
  security: Shield,
  api: Zap,
  file_operation: FileText
}

// Color mapping for log levels
const LEVEL_COLORS = {
  DEBUG: 'bg-gray-100 text-gray-800',
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-red-600 text-white'
}

// Icon mapping for log levels
const LEVEL_ICONS = {
  DEBUG: Activity,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  CRITICAL: XCircle
}

// Color mapping for log types
const LOG_TYPE_COLORS = {
  system: 'bg-purple-100 text-purple-800',
  user_activity: 'bg-green-100 text-green-800',
  email: 'bg-blue-100 text-blue-800',
  auth: 'bg-orange-100 text-orange-800',
  security: 'bg-red-100 text-red-800',
  api: 'bg-yellow-100 text-yellow-800',
  file_operation: 'bg-indigo-100 text-indigo-800'
}

export function UnifiedLogsTable({ logs, isLoading = false, onRefresh, title = "System Logs" }: UnifiedLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<UnifiedLogEntry | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>()
    logs.forEach(log => {
      if (log.user_email) users.add(log.user_email)
    })
    return Array.from(users).sort()
  }, [logs])

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address?.includes(searchTerm)

      const matchesLevel = levelFilter === 'all' || log.level === levelFilter
      const matchesType = typeFilter === 'all' || log.log_type === typeFilter
      const matchesUser = userFilter === 'all' || log.user_email === userFilter

      return matchesSearch && matchesLevel && matchesType && matchesUser
    })
  }, [logs, searchTerm, levelFilter, typeFilter, userFilter])

  // Paginate filtered logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredLogs.slice(start, start + itemsPerPage)
  }, [filteredLogs, currentPage])

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM dd, HH:mm:ss')
  }

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Render user cell with avatar and info
  const renderUserCell = (log: UnifiedLogEntry) => {
    if (!log.user_id && !log.user_email) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <Activity className="h-4 w-4" />
          <span className="text-sm">System</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={log.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getUserInitials(log.full_name || log.user_name, log.user_email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {log.full_name || log.user_name || log.user_email}
          </div>
          {(log.full_name || log.user_name) && log.user_email && (
            <div className="text-xs text-gray-500 truncate">
              {log.user_email}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render IP address with tooltip
  const renderIpCell = (ipAddress?: string | null) => {
    if (!ipAddress) {
      return <span className="text-gray-400">—</span>
    }

    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-mono">{ipAddress}</span>
      </div>
    )
  }

  // Render action badge with icon
  const renderActionBadge = (log: UnifiedLogEntry) => {
    const TypeIcon = LOG_TYPE_ICONS[log.log_type]
    return (
      <Badge variant="outline" className={LOG_TYPE_COLORS[log.log_type]}>
        <TypeIcon className="h-3 w-3 mr-1" />
        {log.action.replace(/_/g, ' ')}
      </Badge>
    )
  }

  // Render level badge with icon
  const renderLevelBadge = (level: string) => {
    const LevelIcon = LEVEL_ICONS[level as keyof typeof LEVEL_ICONS]
    return (
      <Badge className={LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]}>
        <LevelIcon className="h-3 w-3 mr-1" />
        {level}
      </Badge>
    )
  }

  // Render log details in modal
  const renderLogDetails = (log: UnifiedLogEntry) => {
    return (
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="font-semibold mb-3">Basic Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Timestamp:</span>
              <div className="text-gray-600">
                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
              </div>
            </div>
            <div>
              <span className="font-medium">ID:</span>
              <div className="text-gray-600 font-mono text-xs">{log.id}</div>
            </div>
            <div>
              <span className="font-medium">Type:</span>
              <div>{renderActionBadge(log)}</div>
            </div>
            <div>
              <span className="font-medium">Level:</span>
              <div>{renderLevelBadge(log.level)}</div>
            </div>
          </div>
        </div>

        {/* User Information */}
        {(log.user_id || log.user_email) && (
          <div>
            <h4 className="font-semibold mb-3">User Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">User:</span>
                <div>{renderUserCell(log)}</div>
              </div>
              {log.user_role && (
                <div>
                  <span className="font-medium">Role:</span>
                  <div className="text-gray-600">{log.user_role}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network Information */}
        {(log.ip_address || log.user_agent) && (
          <div>
            <h4 className="font-semibold mb-3">Network Information</h4>
            <div className="space-y-2 text-sm">
              {log.ip_address && (
                <div>
                  <span className="font-medium">IP Address:</span>
                  <div className="text-gray-600 font-mono">{log.ip_address}</div>
                </div>
              )}
              {log.user_agent && (
                <div>
                  <span className="font-medium">User Agent:</span>
                  <div className="text-gray-600 text-xs break-all">{log.user_agent}</div>
                </div>
              )}
              {log.request_method && log.request_path && (
                <div>
                  <span className="font-medium">Request:</span>
                  <div className="text-gray-600 font-mono">
                    {log.request_method} {log.request_path}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resource Information */}
        {(log.resource_type || log.resource_id) && (
          <div>
            <h4 className="font-semibold mb-3">Resource Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {log.resource_type && (
                <div>
                  <span className="font-medium">Type:</span>
                  <div className="text-gray-600">{log.resource_type}</div>
                </div>
              )}
              {log.resource_id && (
                <div>
                  <span className="font-medium">ID:</span>
                  <div className="text-gray-600 font-mono">{log.resource_id}</div>
                </div>
              )}
              {log.resource_name && (
                <div className="col-span-2">
                  <span className="font-medium">Name:</span>
                  <div className="text-gray-600">{log.resource_name}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Details */}
        {log.details && Object.keys(log.details).length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Event Details</h4>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        {(log.module || log.correlation_id) && (
          <div>
            <h4 className="font-semibold mb-3">Metadata</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {log.module && (
                <div>
                  <span className="font-medium">Module:</span>
                  <div className="text-gray-600">{log.module}</div>
                </div>
              )}
              {log.correlation_id && (
                <div>
                  <span className="font-medium">Correlation ID:</span>
                  <div className="text-gray-600 font-mono text-xs">{log.correlation_id}</div>
                </div>
              )}
              <div>
                <span className="font-medium">Generated By:</span>
                <div className="text-gray-600">
                  {log.is_system_generated ? 'System' : 'User Action'}
                </div>
              </div>
              {log.is_sensitive && (
                <div>
                  <span className="font-medium">Sensitive:</span>
                  <div className="text-red-600">Contains sensitive data</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="DEBUG">Debug</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
              <SelectItem value="WARNING">Warning</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="user_activity">User Activity</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="auth">Authentication</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="file_operation">File Operation</SelectItem>
            </SelectContent>
          </Select>
          
          {uniqueUsers.length > 0 && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No logs found matching your criteria</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Time</TableHead>
                  <TableHead className="w-[180px]">User</TableHead>
                  <TableHead className="w-[140px]">IP Address</TableHead>
                  <TableHead className="w-[120px]">Level</TableHead>
                  <TableHead className="w-[160px]">Action</TableHead>
                  <TableHead className="flex-1">Message</TableHead>
                  <TableHead className="w-[80px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>{renderUserCell(log)}</TableCell>
                    <TableCell>{renderIpCell(log.ip_address)}</TableCell>
                    <TableCell>{renderLevelBadge(log.level)}</TableCell>
                    <TableCell>{renderActionBadge(log)}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900 truncate max-w-[300px]">
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Log Details</DialogTitle>
                          </DialogHeader>
                          {renderLogDetails(log)}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of{' '}
                  {filteredLogs.length} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 px-3 py-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 
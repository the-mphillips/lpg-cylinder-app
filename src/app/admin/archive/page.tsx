'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Simple toast replacement for now
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    console.log(`${variant === 'destructive' ? 'Error' : 'Success'}: ${title} - ${description}`)
  }
})
import { api } from '@/lib/trpc/client'
import { RotateCcw, Trash2, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ArchivedReport {
  id: string
  report_number: string
  customer: string
  status: string
  gas_type: string
  vehicle_id: string
  formatted_created_date: string
  formatted_deleted_date: string
  deleted_by_name: string
}

export default function ArchiveManagementPage() {
  const { toast } = useToast()
  const [selectedReport, setSelectedReport] = useState<ArchivedReport | null>(null)
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false)
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')

  // Queries and mutations
  const { data: archivedReports = [], isLoading, refetch } = api.reports.getArchivedReports.useQuery()
  
  const restoreMutation = api.reports.restoreReport.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report restored successfully",
      })
      refetch()
      setIsRestoreDialogOpen(false)
      setSelectedReport(null)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const permanentDeleteMutation = api.reports.permanentlyDeleteReport.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report permanently deleted",
      })
      refetch()
      setIsPermanentDeleteDialogOpen(false)
      setSelectedReport(null)
      setAdminPassword('')
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleRestore = (report: ArchivedReport) => {
    setSelectedReport(report)
    setIsRestoreDialogOpen(true)
  }

  const handlePermanentDelete = (report: ArchivedReport) => {
    setSelectedReport(report)
    setIsPermanentDeleteDialogOpen(true)
  }

  const confirmRestore = () => {
    if (selectedReport) {
      restoreMutation.mutate({ id: selectedReport.id })
    }
  }

  const confirmPermanentDelete = () => {
    if (selectedReport && adminPassword) {
      permanentDeleteMutation.mutate({ 
        id: selectedReport.id, 
        adminPassword 
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

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
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Archive Management</h1>
          <p className="text-muted-foreground">Manage archived (soft-deleted) reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archived Reports ({archivedReports.length})</CardTitle>
          <CardDescription>
            These reports have been archived and can be restored or permanently deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archivedReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No archived reports found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Gas Type</TableHead>
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Archived Date</TableHead>
                  <TableHead>Archived By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.report_number}
                    </TableCell>
                    <TableCell>{report.customer}</TableCell>
                    <TableCell>{report.gas_type}</TableCell>
                    <TableCell>{report.vehicle_id}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>{report.formatted_created_date}</TableCell>
                    <TableCell>{report.formatted_deleted_date}</TableCell>
                    <TableCell>{report.deleted_by_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(report)}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePermanentDelete(report)}
                          disabled={permanentDeleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore report #{selectedReport?.report_number}?
              This will make it visible in the main reports list again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRestore}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={isPermanentDeleteDialogOpen} onOpenChange={setIsPermanentDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Report</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                This will <strong>permanently delete</strong> report #{selectedReport?.report_number}.
                This action cannot be undone!
              </p>
              <p className="text-sm text-red-600">
                Please enter the admin password to confirm this action.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="admin-password">Admin Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPermanentDeleteDialogOpen(false)
                setAdminPassword('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmPermanentDelete}
              disabled={!adminPassword || permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Check, Download, Trash2, ArrowLeft, Archive, X, FileText, Printer } from 'lucide-react'
import { toast } from "sonner"
import { ReportPDFModal } from '@/components/reports/ReportPDFModal'
import { ReportData } from '@/components/reports/ReportPreview'

interface CylinderData {
  cylinderNo: string
  cylinderSpec: string
  wc: string
  extExam: string
  intExam: string
  barcode: string
  remarks: string
  recordedBy: string
}

export default function ViewReportPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string

  // State for modals
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showUnapprovalModal, setShowUnapprovalModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPDFModal, setShowPDFModal] = useState(false)
  
  // Form state
  const [selectedSignatory, setSelectedSignatory] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [archiveReason, setArchiveReason] = useState('')

  // API queries
  const { data: report, isLoading, error } = api.reports.getById.useQuery({ id: reportId })
  const { data: currentUser } = api.auth.getCurrentUser.useQuery()
  const { data: signatories = [] } = api.admin.getSignatories.useQuery()
  const { data: equipment = [] } = api.equipment.list.useQuery()
  const utils = api.useUtils()

  // Mutations
  const approveMutation = api.reports.approve.useMutation({
    onSuccess: async () => {
      toast.success("Report approved successfully", {
        description: "The report has been approved and is ready for use."
      })
      setShowApprovalModal(false)
      setSelectedSignatory('')
      
      // Invalidate both individual report and list queries
      await utils.reports.getById.invalidate({ id: reportId })
      await utils.reports.list.invalidate()
      await utils.dashboard.getDashboardStats.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to approve report", {
        description: error.message
      })
    },
  })

  const unapproveMutation = api.reports.unapprove.useMutation({
    onSuccess: async () => {
      toast.success("Report unapproved successfully", {
        description: "The report status has been reverted to pending."
      })
      setShowUnapprovalModal(false)
      setAdminPassword('')
      
      // Invalidate both individual report and list queries
      await utils.reports.getById.invalidate({ id: reportId })
      await utils.reports.list.invalidate()
      await utils.dashboard.getDashboardStats.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to unapprove report", {
        description: error.message
      })
    },
  })

  const deleteReportMutation = api.reports.delete.useMutation({
    onSuccess: () => {
      toast.success("Report deleted successfully", {
        description: "The report has been permanently deleted."
      })
      router.push('/reports')
    },
    onError: (error) => {
      toast.error("Failed to delete report", {
        description: error.message
      })
    },
  })

  const archiveMutation = api.reports.archiveReport.useMutation({
    onSuccess: () => {
      toast.success("Report archived successfully", {
        description: "The report has been moved to the archive."
      })
      setShowArchiveModal(false)
      setArchiveReason('')
      router.push("/reports")
    },
    onError: (error) => {
      toast.error("Failed to archive report", {
        description: error.message
      })
    },
  })

  const handleApprove = () => {
    if (!selectedSignatory.trim()) {
      toast.error("Signatory required", {
        description: "Please select a signatory to approve this report."
      })
      return
    }

    approveMutation.mutate({
      reportId,
      signatoryName: selectedSignatory,
    })
  }

  const handleUnapprove = () => {
    if (!adminPassword.trim()) {
      toast.error("Password required", {
        description: "Please enter the admin password to unapprove this report."
      })
      return
    }

    unapproveMutation.mutate({
      reportId,
      password: adminPassword,
    })
  }

  const handleDelete = () => {
    if (!adminPassword.trim()) {
      toast.error("Password required", {
        description: "Please enter the admin password to delete this report."
      })
      return
    }

    deleteReportMutation.mutate({
      reportId,
      password: adminPassword,
    })
  }

  const handleArchive = () => {
    if (!archiveReason.trim()) {
      toast.error("Reason required", {
        description: "Please provide a reason for archiving this report."
      })
      return
    }

    archiveMutation.mutate({
      id: reportId,
      reason: archiveReason,
    })
  }

  const handleDuplicate = () => {
    router.push(`/reports/new?duplicate=${reportId}`)
    toast.info("Duplicating report", {
      description: "Creating a new report with the same details."
    })
  }

  // Transform report data for PDF component
  const transformReportData = (): ReportData | null => {
    if (!report) return null
    
    return {
      id: report.id,
      report_number: report.report_number?.toString() || '',
      work_order: report.work_order || '',
      customer: report.customer || '',
      address: typeof report.address === 'object' && report.address ? {
        street: report.address.street || '',
        suburb: report.address.suburb || '',
        state: report.address.state || '',
        postcode: report.address.postcode || ''
      } : {
        street: '',
        suburb: '',
        state: '',
        postcode: ''
      },
      cylinder_gas_type: report.gas_type || '',
      gas_supplier: report.gas_supplier || '',
      size: report.size || '',
      test_date: report.test_date || '',
      tester_names: Array.isArray(report.tester_names) ? report.tester_names : [],
      vehicle_id: report.vehicle_id || '',
      approved_signatory: report.approved_signatory,
      approved_signatory_signature: report.approved_signatory_signature,
      cylinder_data: (report.cylinder_data || []).map((cylinder: CylinderData) => ({
        cylinderNo: cylinder.cylinderNo || '',
        cylinderSpec: cylinder.cylinderSpec || '',
        wc: cylinder.wc || '',
        extExam: cylinder.extExam || '',
        intExam: cylinder.intExam || '',
        barcode: cylinder.barcode || '',
        remarks: cylinder.remarks || '',
        recordedBy: cylinder.recordedBy
      })),
      created_at: report.created_at || '',
      status: report.status || ''
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading report...</div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-red-600">
          {error?.message || 'Report not found'}
        </div>
      </div>
    )
  }

  const canApprove = currentUser?.role === 'Admin' || 
                    currentUser?.role === 'Super Admin' || 
                    currentUser?.role === 'Authorised Signatory'
  const canDelete = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin'

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'submitted': 
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDisplay = (status: string) => {
    return status === 'submitted' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)
  }

  // Helper function to get equipment name by ID
  const getEquipmentName = (equipmentId: string) => {
    const equipmentItem = equipment.find(eq => eq.id === equipmentId)
    return equipmentItem?.name || equipmentId
  }

  // Helper function to create image URL
  const getImageUrl = (imageName: string) => {
    // Images are stored in the app-data bucket under reports/images/
    // Construct the public URL for Supabase storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const bucketName = 'app-data'
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/reports/images/${imageName}`
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <h1 className="text-2xl font-bold">Report #{report.report_number}</h1>
          <Badge className={getStatusColor(report.status)}>
            {getStatusDisplay(report.status)}
          </Badge>
        </div>
        
        <div className="flex space-x-2">
          {/* PDF Export Button */}
          <Button onClick={() => setShowPDFModal(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>

          {/* Quick Print Button */}
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/reports/${reportId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Report
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleDuplicate}>
                <Download className="h-4 w-4 mr-2" />
                Duplicate Report
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {canApprove && report.status !== 'approved' && (
                <DropdownMenuItem onClick={() => setShowApprovalModal(true)}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve Report
                </DropdownMenuItem>
              )}
              
              {canApprove && report.status === 'approved' && (
                <DropdownMenuItem onClick={() => setShowUnapprovalModal(true)}>
                  <X className="h-4 w-4 mr-2" />
                  Unapprove Report
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {canDelete && (
                <DropdownMenuItem onClick={() => setShowArchiveModal(true)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Report
                </DropdownMenuItem>
              )}

              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Report Details */}
      {/* Customer Information - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="Customer" value={report.customer} />
            <InfoItem label="Major Customer" value={report.major_customer_id || 'N/A'} />
            <InfoItem label="Work Order" value={report.work_order || 'N/A'} />
          </div>
          <InfoItem label="Address" value={
            typeof report.address === 'object' && report.address ? 
              `${report.address.street}, ${report.address.suburb}, ${report.address.state} ${report.address.postcode}` :
              report.address || 'N/A'
          } />
        </CardContent>
      </Card>

      {/* Test Information and Gas Details - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem label="Test Date" value={new Date(report.test_date).toLocaleDateString()} />
            <InfoItem label="Tester Names" value={
              Array.isArray(report.tester_names) 
                ? report.tester_names.join(', ') 
                : report.tester_names || 'N/A'
            } />
            <InfoItem label="Vehicle ID" value={report.vehicle_id} />
            <InfoItem label="Status" value={
              <Badge className={getStatusColor(report.status)}>
                {getStatusDisplay(report.status)}
              </Badge>
            } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gas Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem label="Gas Type" value={report.gas_type} />
            <InfoItem label="Cylinder Size" value={report.size} />
            <InfoItem label="Gas Supplier" value={report.gas_supplier || 'N/A'} />
            <InfoItem label="Total Cylinders" value={report.cylinder_data?.length || 0} />
          </CardContent>
        </Card>
      </div>

      {/* Cylinder Data */}
      <Card>
        <CardHeader>
          <CardTitle>Cylinder Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cylinder No</TableHead>
                <TableHead>Specification</TableHead>
                <TableHead>WC</TableHead>
                <TableHead>Ext Exam</TableHead>
                <TableHead>Int Exam</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.cylinder_data?.map((cylinder: CylinderData, index: number) => (
                <TableRow key={index}>
                  <TableCell>{cylinder.cylinderNo}</TableCell>
                  <TableCell>{cylinder.cylinderSpec}</TableCell>
                  <TableCell>{cylinder.wc}</TableCell>
                  <TableCell>
                    <Badge className={cylinder.extExam === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {cylinder.extExam}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cylinder.intExam === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {cylinder.intExam}
                    </Badge>
                  </TableCell>
                  <TableCell>{cylinder.barcode}</TableCell>
                  <TableCell>{cylinder.remarks || '-'}</TableCell>
                  <TableCell>{cylinder.recordedBy || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Office Information */}
      <Card>
        <CardHeader>
          <CardTitle>Office Information</CardTitle>
          <p className="text-sm text-muted-foreground">Internal documentation (not included in printed reports)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoItem 
            label="Notes" 
            value={report.notes && typeof report.notes === 'string' && report.notes.trim() ? (
              <div className="whitespace-pre-wrap">{report.notes}</div>
            ) : (
              <span className="text-gray-500 italic">No notes</span>
            )} 
          />
          <InfoItem 
            label="Equipment Used" 
            value={Array.isArray(report.equipment_used) && report.equipment_used.length > 0 ? (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  {report.equipment_used.length} equipment item(s) used
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {report.equipment_used.map((equipmentId: string, index: number) => (
                    <div key={index} className="text-sm bg-muted px-2 py-1 rounded">
                      {getEquipmentName(equipmentId)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 italic">Not specified</span>
            )} 
          />
          <InfoItem 
            label="Images" 
            value={Array.isArray(report.images) && report.images.length > 0 ? (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  {report.images.length} image(s) attached
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {report.images.map((imageName: string, index: number) => (
                    <div key={index} className="relative group">
                      <img 
                        src={getImageUrl(imageName)}
                        alt={`Report image ${index + 1}`}
                        className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(getImageUrl(imageName), '_blank')}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 italic">No images</span>
            )} 
          />
        </CardContent>
      </Card>

      {/* Approval Information and Audit Trail - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Information */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.status === 'approved' && report.approved_signatory ? (
              <>
                <InfoItem label="Approved By" value={report.approved_signatory} />
                <InfoItem label="Approved Date" value={new Date(report.updated_at).toLocaleDateString()} />
                {report.approved_signatory_signature && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Signature</Label>
                    <img 
                      src={`/api/signatures/${report.approved_signatory_signature}`} 
                      alt="Authorized Signatory's signature" 
                      className="max-w-[150px] border rounded mt-1"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 italic">Not yet approved</div>
            )}
          </CardContent>
        </Card>

        {/* Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem 
              label="Created By" 
              value={report.created_by_name || 'Unknown'} 
            />
            <InfoItem 
              label="Created At" 
              value={report.created_at ? new Date(report.created_at).toLocaleString() : 'Unknown'} 
            />
            {report.updated_by_name && report.updated_at !== report.created_at && (
              <>
                <InfoItem 
                  label="Last Updated By" 
                  value={report.updated_by_name} 
                />
                <InfoItem 
                  label="Last Updated At" 
                  value={new Date(report.updated_at).toLocaleString()} 
                />
              </>
            )}
            {report.approved_by_name && (
              <InfoItem 
                label="Approved By User" 
                value={report.approved_by_name} 
              />
            )}
            {report.submitted_by_name && (
              <InfoItem 
                label="Submitted By" 
                value={report.submitted_by_name} 
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Report</DialogTitle>
            <DialogDescription>
              Select a signatory to approve this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signatory">Authorized Signatory</Label>
              <Select value={selectedSignatory} onValueChange={setSelectedSignatory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a signatory" />
                </SelectTrigger>
                <SelectContent>
                  {signatories.map((signatory: { id: string; name: string }) => (
                    <SelectItem key={signatory.id} value={signatory.name}>
                      {signatory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveMutation.isPending || !selectedSignatory}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unapprove Modal */}
      <Dialog open={showUnapprovalModal} onOpenChange={setShowUnapprovalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unapprove Report</DialogTitle>
            <DialogDescription>
              Enter the admin password to unapprove this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unapprove-password">Admin Password</Label>
              <Input
                id="unapprove-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnapprovalModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUnapprove}
              disabled={unapproveMutation.isPending || !adminPassword}
              variant="destructive"
            >
              {unapproveMutation.isPending ? 'Unapproving...' : 'Unapprove Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Modal */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Report</DialogTitle>
            <DialogDescription>
              Provide a reason for archiving this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="archive-reason">Reason for archiving</Label>
              <Textarea
                id="archive-reason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Enter reason for archiving..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
              variant="destructive"
            >
              {archiveMutation.isPending ? 'Archiving...' : 'Archive Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Enter the admin password to permanently delete this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Admin Password</Label>
              <Input
                id="delete-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={deleteReportMutation.isPending || !adminPassword}
              variant="destructive"
            >
              {deleteReportMutation.isPending ? 'Deleting...' : 'Delete Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Export Modal */}
      <ReportPDFModal
        open={showPDFModal}
        onOpenChange={setShowPDFModal}
        reportData={transformReportData()}
        showEmailOption={true}
      />
    </div>
  )
}

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium text-gray-600">{label}</Label>
    <div className="text-sm">{value || 'N/A'}</div>
  </div>
) 
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
import Image from 'next/image'
import { ImageLightbox } from '@/components/ui/image-lightbox'

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

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

  // Helper to normalize Supabase storage URLs and handle absolute or pre-prefixed paths
  const getImageUrl = (imageName: string) => {
    if (!imageName) return ''
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    // If already absolute
    try {
      const parsed = new URL(imageName)
      if (parsed.hostname.endsWith('supabase.co') && projectUrl) {
        const currentHost = new URL(projectUrl).hostname
        if (parsed.hostname !== currentHost) {
          parsed.hostname = currentHost
          return parsed.toString()
        }
      }
      return parsed.toString()
    } catch {}

    // If imageName already contains a bucket-relative path like 'reports/images/..'
    if (imageName.startsWith('reports/')) {
      return `${projectUrl}/storage/v1/object/public/app-data/${imageName}`
    }
    if (imageName.startsWith('app-data/')) {
      return `${projectUrl}/storage/v1/object/public/${imageName}`
    }
    // Treat as bare filename inside our standard folder
    return `${projectUrl}/storage/v1/object/public/app-data/reports/images/${imageName}`
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Sticky action bar (mobile) */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-2 md:hidden">
        <Button variant="outline" onClick={() => window.print()} aria-label="Print"><Printer className="h-4 w-4"/></Button>
        <Button onClick={() => setShowPDFModal(true)} aria-label="Export PDF"><FileText className="h-4 w-4"/></Button>
      </div>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Report #{report.report_number}</h1>
              <Badge className={getStatusColor(report.status)}>
                {getStatusDisplay(report.status)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {report.customer} • {report.formatted_date || (report.test_date ? new Date(report.test_date).toLocaleDateString() : '')}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Summary Sidebar */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Customer:</span> {report.customer}</div>
            <div><span className="text-muted-foreground">Vehicle:</span> {report.vehicle_id || 'N/A'}</div>
            <div><span className="text-muted-foreground">Work Order:</span> {report.work_order || 'N/A'}</div>
            <div><span className="text-muted-foreground">Test Date:</span> {report.test_date ? new Date(report.test_date).toLocaleDateString() : 'N/A'}</div>
            <div><span className="text-muted-foreground">Status:</span> {getStatusDisplay(report.status)}</div>
            <div><span className="text-muted-foreground">Cylinders:</span> {report.cylinder_data?.length || 0}</div>
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
                <div className="flex flex-wrap gap-2">
                  {report.equipment_used.map((equipmentId: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full border text-xs bg-background">
                      {getEquipmentName(equipmentId)}
                    </span>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {report.images.map((imageName: string, index: number) => {
                    const url = getImageUrl(imageName)
                    return (
                      <button key={index} type="button" onClick={() => { setLightboxIndex(index); setLightboxOpen(true) }} className="block">
                        <div className="relative rounded border overflow-hidden bg-white">
                          <Image 
                            src={url}
                            alt={`Report image ${index + 1}`}
                            width={320}
                            height={180}
                            className="w-full h-32 object-cover transition-transform group-hover:scale-[1.01]"
                            unoptimized
                          />
                          <div className="pointer-events-none absolute inset-0 rounded flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity">
                            <span className="text-white text-xs">View</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 italic">No images</span>
            )} 
          />
          {Array.isArray(report.images) && report.images.length > 0 && (
            <ImageLightbox 
              open={lightboxOpen}
              onOpenChange={setLightboxOpen}
              images={report.images.map((name: string) => getImageUrl(name))}
              startIndex={lightboxIndex}
            />
          )}
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
                    <Image 
                      src={`/api/signatures/${report.approved_signatory_signature}`} 
                      alt="Authorized Signatory's signature" 
                      width={150}
                      height={75}
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
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l ml-2 pl-4">
              <li className="mb-4">
                <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-blue-500" />
                <div className="text-sm">Created</div>
                <div className="text-xs text-muted-foreground">{report.created_at ? new Date(report.created_at).toLocaleString() : 'Unknown'}{report.created_by_name ? ` • ${report.created_by_name}` : ''}</div>
              </li>
              {report.updated_by_name && report.updated_at !== report.created_at && (
                <li className="mb-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-amber-500" />
                  <div className="text-sm">Updated</div>
                  <div className="text-xs text-muted-foreground">{new Date(report.updated_at).toLocaleString()} • {report.updated_by_name}</div>
                </li>
              )}
              {report.approved_by_name && (
                <li className="mb-2">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-green-600" />
                  <div className="text-sm">Approved</div>
                  <div className="text-xs text-muted-foreground">{new Date(report.updated_at).toLocaleString()} • {report.approved_by_name}</div>
                </li>
              )}
              {report.submitted_by_name && (
                <li className="mb-2">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-purple-600" />
                  <div className="text-sm">Submitted</div>
                  <div className="text-xs text-muted-foreground">{report.formatted_date || ''} • {report.submitted_by_name}</div>
                </li>
              )}
            </ol>
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
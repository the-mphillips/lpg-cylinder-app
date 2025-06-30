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
// Simple toast replacement for now
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    console.log(`${variant === 'destructive' ? 'Error' : 'Success'}: ${title} - ${description}`)
  }
})
import { 
  Eye, 
  Edit, 
  Check, 
  Download, 
  Mail, 
  Trash2, 
  ArrowLeft,
  ExternalLink
} from 'lucide-react'

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

// interface Report {
//   id: string
//   report_number: string
//   customer_name: string
//   address: string
//   suburb: string
//   state: string
//   postcode: string
//   cylinder_gas_type: string
//   size: string
//   gas_supplier: string
//   test_date: string
//   tester_names: string
//   vehicle_id: string
//   work_order: string
//   status: string
//   approved_signatory?: string
//   approved_signatory_signature?: string
//   major_customer_id?: string
//   cylinder_data: CylinderData[]
//   created_at: string
//   updated_at: string
// }

// interface Signatory {
//   id: string
//   name: string
//   signature_path?: string
// }



export default function ViewReportPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string
  const { toast } = useToast()

  // State for modals
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false)

  // Form state
  const [selectedSignatory, setSelectedSignatory] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [emailBody, setEmailBody] = useState('')

  // API queries
  const { data: report, isLoading, error, refetch } = api.reports.getById.useQuery({ id: reportId })
  const { data: currentUser } = api.auth.getCurrentUser.useQuery()
  const { data: signatories = [] } = api.admin.getSignatories.useQuery()

  // Mutations
  const approveReportMutation = api.reports.approve.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report approved successfully",
      })
      setApproveModalOpen(false)
      setSelectedSignatory('')
      refetch()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to approve report: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  const deleteReportMutation = api.reports.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report deleted successfully",
      })
      router.push('/reports')
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete report: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  const sendEmailMutation = api.reports.sendEmail.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report sent successfully",
      })
      setEmailModalOpen(false)
      setEmailConfirmOpen(false)
      setCustomerEmail('')
      setEmailBody('')
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send report: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  const handleApprove = () => {
    if (!selectedSignatory) {
      toast({
        title: "Error",
        description: "Please select a signatory",
        variant: "destructive",
      })
      return
    }
    approveReportMutation.mutate({ 
      reportId, 
      signatoryName: selectedSignatory 
    })
  }

  const handleDelete = () => {
    if (!deletePassword) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive",
      })
      return
    }
    deleteReportMutation.mutate({ 
      reportId, 
      password: deletePassword 
    })
  }

  const handleSendEmail = () => {
    if (!customerEmail || !emailBody) {
      toast({
        title: "Error",
        description: "Please fill in all email fields",
        variant: "destructive",
      })
      return
    }
    sendEmailMutation.mutate({
      reportId,
      customerEmail,
      emailBody,
    })
  }

  const openEmailModal = () => {
    setEmailModalOpen(true)
    setEmailBody(`Dear ${report?.customer_name},

I&apos;m pleased to inform you that we have received your payment for the Cylinder Retest, and the Test Certificate has been issued for ongoing compliance.

Attached is the Cylinder Test Report/Certificate for your records.

Thank you for choosing BWA GAS – we greatly appreciate your business.

Kind regards,
Accounts Team
BWA GAS`)
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
  const canEmail = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin'

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

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Report Details</h1>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/reports/${reportId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Report
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Report Information */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Report Number" value={report.report_number} />
            <InfoItem label="Customer Name" value={report.customer_name} />
            <InfoItem 
              label="Address" 
              value={`${report.address}, ${report.suburb}, ${report.state} ${report.postcode}`} 
            />
            <InfoItem label="Date" value={new Date(report.test_date).toLocaleDateString()} />
            <InfoItem 
              label="Status" 
              value={
                <Badge className={getStatusColor(report.status)}>
                  {getStatusDisplay(report.status)}
                </Badge>
              } 
            />
            <InfoItem label="Work Order" value={report.work_order || 'N/A'} />
            <InfoItem label="Vehicle ID" value={report.vehicle_id} />
          </div>
        </CardContent>
      </Card>

      {/* Gas Details */}
      <Card>
        <CardHeader>
          <CardTitle>Gas Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="Gas Type" value={report.cylinder_gas_type} />
            <InfoItem label="Size" value={report.size} />
            <InfoItem label="Supplier" value={report.gas_supplier || 'N/A'} />
          </div>
        </CardContent>
      </Card>

      {/* Test Details */}
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="Testers" value={report.tester_names} />
            <InfoItem label="Authorised Signatory" value={report.approved_signatory || 'Not approved'} />
            {report.approved_signatory_signature && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Signature</p>
                <img 
                  src={`/api/signatures/${report.approved_signatory_signature}`} 
                  alt="Authorised Signatory's signature" 
                  className="max-w-[150px] border rounded"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cylinder Data */}
      <Card>
        <CardHeader>
          <CardTitle>Cylinder Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cylinder No.</TableHead>
                  <TableHead>Cylinder Specification</TableHead>
                  <TableHead>W.C. (kg)</TableHead>
                  <TableHead>Result of EXT Exam</TableHead>
                  <TableHead>Result of INT Exam</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(report.cylinder_data) && report.cylinder_data.length > 0 ? (
                  report.cylinder_data.map((cylinder: CylinderData, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{cylinder.cylinderNo || ''}</TableCell>
                      <TableCell>{cylinder.cylinderSpec || ''}</TableCell>
                      <TableCell>{cylinder.wc || ''}</TableCell>
                      <TableCell>{cylinder.extExam || ''}</TableCell>
                      <TableCell>{cylinder.intExam || ''}</TableCell>
                      <TableCell>{cylinder.barcode || ''}</TableCell>
                      <TableCell>{cylinder.remarks || ''}</TableCell>
                      <TableCell>{cylinder.recordedBy || ''}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No cylinder data available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {canApprove && report.status !== 'approved' && (
          <Button 
            onClick={() => setApproveModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve Report
          </Button>
        )}
        
        <Button 
          onClick={() => setShowPdfPreview(!showPdfPreview)}
          variant="outline"
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPdfPreview ? 'Hide PDF Preview' : 'Show PDF Preview'}
        </Button>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        
        {canEmail && (
          <Button onClick={openEmailModal} variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Send Report to Customer
          </Button>
        )}
        
        {canDelete && (
          <Button 
            onClick={() => setDeleteModalOpen(true)}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Report
          </Button>
        )}
      </div>

      {/* PDF Preview */}
      {showPdfPreview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Test Report PDF Preview</CardTitle>
            <Button variant="outline" asChild>
              <Link href={`/reports/${reportId}/preview`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Preview in New Window
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] border rounded-lg bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">PDF Preview will be implemented here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Report</DialogTitle>
            <DialogDescription>
              Select an authorised signatory to approve this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="signatory">Authorised Signatory</Label>
              <Select value={selectedSignatory} onValueChange={setSelectedSignatory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select signatory" />
                </SelectTrigger>
                <SelectContent>
                  {signatories.map((signatory) => (
                    <SelectItem key={signatory.id} value={signatory.name}>
                      {signatory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveReportMutation.status === 'pending' || !selectedSignatory}
            >
              {approveReportMutation.status === 'pending' ? 'Approving...' : 'Approve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteReportMutation.status === 'pending' || !deletePassword}
            >
              {deleteReportMutation.status === 'pending' ? 'Deleting...' : 'Delete Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Report to Customer</DialogTitle>
            <DialogDescription>
              Enter the customer's email address and customize the message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Customer Email</Label>
              <Input
                id="email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => setEmailConfirmOpen(true)}
              disabled={!customerEmail || !emailBody}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Modal */}
      <Dialog open={emailConfirmOpen} onOpenChange={setEmailConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Email Send</DialogTitle>
            <DialogDescription>
              Are you sure you want to send this report to {customerEmail}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={sendEmailMutation.status === 'pending'}
            >
              {sendEmailMutation.status === 'pending' ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper component for displaying info items
const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className="font-semibold">{typeof value === 'string' ? value : value}</p>
  </div>
) 
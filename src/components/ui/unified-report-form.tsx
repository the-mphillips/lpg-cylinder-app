"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react"
import { api } from "@/lib/trpc/client"

interface CylinderData {
  cylinderNo: string
  cylinderSpec: string
  wc: string
  extExam: 'PASS' | 'FAIL'
  intExam: 'PASS' | 'FAIL'
  barcode: string
  remarks?: string
  recordedBy?: string
}

interface ReportFormData {
  customer: string
  address: {
    street: string
    suburb: string
    state: string
    postcode: string
  }
  gas_type: string
  gas_supplier?: string
  size: string
  test_date: string
  tester_names: string[]
  vehicle_id: string
  work_order?: string
  major_customer_id?: string
  status: 'draft' | 'pending'
  notes?: string
  equipment_used?: string[]
  images?: string[]
  cylinder_data: CylinderData[]
}

interface UnifiedReportFormProps {
  mode: 'create' | 'edit'
  reportId?: string
  initialData?: Partial<ReportFormData>
  onSuccess?: () => void
  onCancel?: () => void
}

export function UnifiedReportForm({ 
  mode, 
  reportId, 
  initialData, 
  onSuccess, 
  onCancel 
}: UnifiedReportFormProps) {
  const router = useRouter()
  
  // Fetch dynamic dropdown data
  const { data: formDefaults } = api.settings.getFormDefaults.useQuery()
  const { data: testers } = api.reports.getTesters.useQuery()
  const { data: majorCustomers } = api.reports.getMajorCustomers.useQuery()
  const { data: nextReportNumber } = api.reports.getNextReportNumber.useQuery(undefined, {
    enabled: mode === 'create'
  })

  // Fetch existing report data for edit mode
  const { data: existingReport } = api.reports.getById.useQuery(
    { id: reportId! },
    { enabled: mode === 'edit' && !!reportId }
  )

  // Form state
  const [formData, setFormData] = useState<ReportFormData>({
    customer: '',
    address: {
      street: '',
      suburb: '',
      state: 'VIC',
      postcode: ''
    },
    gas_type: '',
    gas_supplier: '',
    size: '',
    test_date: new Date().toISOString().split('T')[0],
    tester_names: [],
    vehicle_id: '',
    work_order: '',
    major_customer_id: '',
    status: 'draft',
    notes: '',
    equipment_used: [],
    images: [],
    cylinder_data: [{
      cylinderNo: '1',
      cylinderSpec: '',
      wc: '',
      extExam: 'PASS',
      intExam: 'PASS',
      barcode: '',
      remarks: '',
      recordedBy: ''
    }]
  })

  const [selectedTesters, setSelectedTesters] = useState<string[]>([])

  // Mutations
  const createReportMutation = api.reports.create.useMutation({
    onSuccess: () => {
      toast.success("Report created successfully")
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/reports')
      }
    },
    onError: (error) => {
      toast.error("Failed to create report", {
        description: error.message
      })
    }
  })

  const updateReportMutation = api.reports.update.useMutation({
    onSuccess: () => {
      toast.success("Report updated successfully")
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/reports/${reportId}`)
      }
    },
    onError: (error) => {
      toast.error("Failed to update report", {
        description: error.message
      })
    }
  })

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && existingReport) {
      setFormData({
        customer: existingReport.customer || '',
        address: typeof existingReport.address === 'object' 
          ? existingReport.address 
          : {
              street: '',
              suburb: '',
              state: 'VIC',
              postcode: ''
            },
        gas_type: existingReport.gas_type || '',
        gas_supplier: existingReport.gas_supplier || '',
        size: existingReport.size || '',
        test_date: existingReport.test_date || new Date().toISOString().split('T')[0],
        tester_names: Array.isArray(existingReport.tester_names) 
          ? existingReport.tester_names 
          : [],
        vehicle_id: existingReport.vehicle_id || '',
        work_order: existingReport.work_order || '',
        major_customer_id: existingReport.major_customer_id || '',
        status: existingReport.status || 'draft',
        notes: existingReport.notes || '',
        equipment_used: Array.isArray(existingReport.equipment_used) ? existingReport.equipment_used : [],
        images: Array.isArray(existingReport.images) ? existingReport.images : [],
        cylinder_data: Array.isArray(existingReport.cylinder_data) 
          ? existingReport.cylinder_data 
          : [{
              cylinderNo: '1',
              cylinderSpec: '',
              wc: '',
              extExam: 'PASS',
              intExam: 'PASS',
              barcode: '',
              remarks: '',
              recordedBy: ''
            }]
      })
      setSelectedTesters(
        Array.isArray(existingReport.tester_names) 
          ? existingReport.tester_names 
          : []
      )
    } else if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [existingReport, initialData, mode])

  // Handlers
  const handleInputChange = (field: keyof ReportFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddressChange = (field: keyof ReportFormData['address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
  }

  const handleCylinderChange = (index: number, field: keyof CylinderData, value: string) => {
    setFormData(prev => ({
      ...prev,
      cylinder_data: prev.cylinder_data.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addCylinder = () => {
    setFormData(prev => ({
      ...prev,
      cylinder_data: [
        ...prev.cylinder_data,
        {
          cylinderNo: (prev.cylinder_data.length + 1).toString(),
          cylinderSpec: '',
          wc: '',
          extExam: 'PASS',
          intExam: 'PASS',
          barcode: '',
          remarks: '',
          recordedBy: ''
        }
      ]
    }))
  }

  const removeCylinder = (index: number) => {
    if (formData.cylinder_data.length > 1) {
      setFormData(prev => ({
        ...prev,
        cylinder_data: prev.cylinder_data.filter((_, i) => i !== index)
      }))
    }
  }

  const handleTesterToggle = (testerName: string) => {
    setSelectedTesters(prev => {
      const newTesters = prev.includes(testerName)
        ? prev.filter(t => t !== testerName)
        : [...prev, testerName]
      
      setFormData(prevForm => ({
        ...prevForm,
        tester_names: newTesters
      }))
      
      return newTesters
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer.trim()) {
      toast.error("Please enter customer name")
      return
    }
    
    if (formData.tester_names.length === 0) {
      toast.error("Please select at least one tester")
      return
    }
    
    if (mode === 'create') {
      createReportMutation.mutate({
        ...formData,
        status: 'pending'
      })
    } else if (mode === 'edit' && reportId) {
      updateReportMutation.mutate({
        id: reportId,
        ...formData,
        status: 'pending'
      })
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  const isLoading = createReportMutation.status === 'pending' || updateReportMutation.status === 'pending'

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {mode === 'create' ? 'Create New Report' : 'Edit Report'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create' 
              ? `Report Number: ${nextReportNumber || 'Loading...'}`
              : `Editing Report #${existingReport?.report_number || reportId?.slice(0, 8)}`
            }
          </p>
        </div>
        <Button variant="outline" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Enter customer details and address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer Name *</Label>
                <Select 
                  value={formData.customer} 
                  onValueChange={(value) => handleInputChange('customer', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type customer name" />
                  </SelectTrigger>
                  <SelectContent>
                    {majorCustomers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.name}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="work_order">Work Order</Label>
                <Input
                  id="work_order"
                  value={formData.work_order}
                  onChange={(e) => handleInputChange('work_order', e.target.value)}
                  placeholder="Enter work order number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={formData.address.suburb}
                  onChange={(e) => handleAddressChange('suburb', e.target.value)}
                  placeholder="Enter suburb"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Select 
                  value={formData.address.state} 
                  onValueChange={(value) => handleAddressChange('state', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="QLD">QLD</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="WA">WA</SelectItem>
                    <SelectItem value="TAS">TAS</SelectItem>
                    <SelectItem value="NT">NT</SelectItem>
                    <SelectItem value="ACT">ACT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={formData.address.postcode}
                  onChange={(e) => handleAddressChange('postcode', e.target.value)}
                  placeholder="Enter postcode"
                />
              </div>
              <div>
                <Label htmlFor="vehicle_id">Vehicle ID</Label>
                <Select 
                  value={formData.vehicle_id} 
                  onValueChange={(value) => handleInputChange('vehicle_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {formDefaults?.vehicleIds?.map((vehicle) => (
                      <SelectItem key={vehicle} value={vehicle}>
                        {vehicle}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Information */}
        <Card>
          <CardHeader>
            <CardTitle>Test Information</CardTitle>
            <CardDescription>Configure test parameters and details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="gas_type">Gas Type</Label>
                <Select 
                  value={formData.gas_type} 
                  onValueChange={(value) => handleInputChange('gas_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gas type" />
                  </SelectTrigger>
                  <SelectContent>
                    {formDefaults?.gasTypes?.map((gas) => (
                      <SelectItem key={gas} value={gas}>
                        {gas}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
              <div>
                                <Label htmlFor="size">Cylinder Size</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => handleInputChange('size', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cylinder size" />
                  </SelectTrigger>
                  <SelectContent>
                    {formDefaults?.cylinderSizes?.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="test_date">Test Date</Label>
                <Input
                  id="test_date"
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => handleInputChange('test_date', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Testers *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {testers?.map((tester) => (
                  <Badge
                    key={tester.id}
                    variant={selectedTesters.includes(tester.name) ? "default" : "outline"}
                    className="cursor-pointer justify-center py-2"
                    onClick={() => handleTesterToggle(tester.name)}
                  >
                    {tester.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cylinder Data */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cylinder Data</CardTitle>
              <CardDescription>Enter cylinder inspection details</CardDescription>
            </div>
            <Button type="button" onClick={addCylinder}>
              <Plus className="w-4 h-4 mr-2" />
              Add Cylinder
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.cylinder_data.map((cylinder, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Cylinder {cylinder.cylinderNo}</h4>
                    {formData.cylinder_data.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCylinder(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Cylinder Spec</Label>
                      <Input
                        value={cylinder.cylinderSpec}
                        onChange={(e) => handleCylinderChange(index, 'cylinderSpec', e.target.value)}
                        placeholder="Enter spec"
                      />
                    </div>
                    <div>
                      <Label>Water Capacity (WC)</Label>
                      <Input
                        value={cylinder.wc}
                        onChange={(e) => handleCylinderChange(index, 'wc', e.target.value)}
                        placeholder="Enter WC"
                      />
                    </div>
                    <div>
                      <Label>External Exam</Label>
                      <Select 
                        value={cylinder.extExam} 
                        onValueChange={(value) => handleCylinderChange(index, 'extExam', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PASS">PASS</SelectItem>
                          <SelectItem value="FAIL">FAIL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Internal Exam</Label>
                      <Select 
                        value={cylinder.intExam} 
                        onValueChange={(value) => handleCylinderChange(index, 'intExam', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PASS">PASS</SelectItem>
                          <SelectItem value="FAIL">FAIL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Barcode</Label>
                      <Input
                        value={cylinder.barcode}
                        onChange={(e) => handleCylinderChange(index, 'barcode', e.target.value)}
                        placeholder="Enter barcode"
                      />
                    </div>
                    <div>
                      <Label>Recorded By</Label>
                      <Input
                        value={cylinder.recordedBy}
                        onChange={(e) => handleCylinderChange(index, 'recordedBy', e.target.value)}
                        placeholder="Enter recorder name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Remarks</Label>
                    <Textarea
                      value={cylinder.remarks}
                      onChange={(e) => handleCylinderChange(index, 'remarks', e.target.value)}
                      placeholder="Enter any remarks or notes"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading 
              ? (mode === 'create' ? 'Creating...' : 'Updating...') 
              : (mode === 'create' ? 'Create Report' : 'Update Report')
            }
          </Button>
        </div>
      </form>
    </div>
  )
} 
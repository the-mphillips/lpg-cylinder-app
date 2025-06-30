"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { Save, Eye, ArrowLeft } from "lucide-react"
import { CylinderDataForm } from "../../components/cylinder-data-form"
import Link from "next/link"

// Comprehensive validation schema matching the new report form
const reportSchema = z.object({
  customerType: z.string().min(1, "Required"),
  majorCustomer: z.string().optional(),
  customerName: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  suburb: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  postcode: z.string().min(4, "Required").regex(/^\d{4}$/, "Must be 4 digits"),
  cylinder_gas_type: z.string().min(1, "Required"),
  gasTypeOther: z.string().optional(),
  size: z.string().min(1, "Required"),
  sizeOther: z.string().optional(),
  gas_supplier: z.string().min(1, "Required"),
  supplierOther: z.string().optional(),
  test_date: z.string().min(1, "Required"),
  vehicleId: z.string().min(1, "Required"),
  vehicleIdOther: z.string().optional(),
  work_order: z.string().min(1, "Required"),
  primaryTester: z.string().min(1, "Required"),
  secondTester: z.string().optional(),
  thirdTester: z.string().optional(),
  cylinders: z.array(
    z.object({
      cylinderNo: z.string().min(1, "Required"),
      cylinderSpec: z.string().min(1, "Required"),
      wc: z.string().min(1, "Required"),
      extExam: z.enum(["PASS", "FAIL"], { errorMap: () => ({ message: "Must be PASS or FAIL" }) }),
      intExam: z.enum(["PASS", "FAIL"], { errorMap: () => ({ message: "Must be PASS or FAIL" }) }),
      barcode: z.string().min(1, "Required"),
      remarks: z.string().optional(),
      recordedBy: z.string().optional(),
    })
  ).min(1, "At least one cylinder is required"),
}).superRefine((data, ctx) => {
  // Conditional validation for "Other" fields
  if (data.customerType === 'major' && !data.majorCustomer) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Required for major customers",
      path: ["majorCustomer"],
    })
  }
  if (data.cylinder_gas_type === 'Other' && !data.gasTypeOther) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the gas type",
      path: ["gasTypeOther"],
    })
  }
  if (data.size === 'Other' && !data.sizeOther) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the size",
      path: ["sizeOther"],
    })
  }
  if (data.gas_supplier === 'Other' && !data.supplierOther) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the supplier",
      path: ["supplierOther"],
    })
  }
  if (data.vehicleId === 'Other' && !data.vehicleIdOther) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the vehicle ID",
      path: ["vehicleIdOther"],
    })
  }
})

type ReportFormData = z.infer<typeof reportSchema>

interface CylinderData {
  cylinderNo: string
  cylinderSpec: string
  wc: string
  extExam: string
  intExam: string
  barcode: string
  remarks?: string
  recordedBy?: string
}

// Remove hardcoded options - now fetched dynamically

export default function EditReportPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<ReportFormData | null>(null)
  const [showApprovalWarning, setShowApprovalWarning] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')

  // API queries
  const { data: report, isLoading, error } = api.reports.getById.useQuery({ id: reportId })
  const { data: majorCustomers = [] } = api.reports.getMajorCustomers.useQuery()
  const { data: testers = [] } = api.reports.getTesters.useQuery()
  const { data: formDefaults } = api.settings.getFormDefaults.useQuery()

  // Mutations
  const utils = api.useUtils()
  
  const updateReportMutation = api.reports.update.useMutation({
    onSuccess: async () => {
      toast.success("Report updated successfully", {
        description: "The report has been updated and saved."
      })
      
      // Invalidate and refetch the report data
      await utils.reports.getById.invalidate({ id: reportId })
      await utils.reports.list.invalidate()
      
      router.push(`/reports/${reportId}`)
    },
    onError: (error) => {
      toast.error("Failed to update report", {
        description: error.message
      })
    },
  })

  const unapproveReportMutation = api.reports.unapprove.useMutation({
    onSuccess: () => {
      toast.success("Report unapproved successfully", {
        description: "You can now edit the report."
      })
      setShowApprovalWarning(false)
      setAdminPassword('')
    },
    onError: (error) => {
      toast.error("Failed to unapprove report", {
        description: error.message
      })
    },
  })

  // Initialize form with default values
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      customerType: '',
      majorCustomer: '',
      customerName: '',
      address: '',
      suburb: '',
      state: '',
      postcode: '',
      cylinder_gas_type: 'LPG',
      gasTypeOther: '',
      size: '',
      sizeOther: '',
      gas_supplier: '',
      supplierOther: '',
      test_date: '',
      vehicleId: '',
      vehicleIdOther: '',
      work_order: '',
      primaryTester: '',
      secondTester: '',
      thirdTester: '',
      cylinders: [{
        cylinderNo: '',
        cylinderSpec: '',
        wc: '',
        extExam: 'PASS',
        intExam: 'PASS',
        barcode: '',
        remarks: '',
        recordedBy: '',
      }],
    },
  })

  // Check if report is approved and show warning
  useEffect(() => {
    if (report && report.status === 'approved') {
      setShowApprovalWarning(true)
    }
  }, [report])

  // Handle unapproval before editing
  const handleUnapprove = () => {
    if (!adminPassword.trim()) {
      toast.error("Password required", {
        description: "Please enter the admin password to unapprove this report."
      })
      return
    }

    unapproveReportMutation.mutate({
      reportId,
      password: adminPassword,
    })
  }

  // Load report data into form when available
  useEffect(() => {
    if (report) {
      console.log('Loading report data:', report)
      
      // Parse existing data safely
      const testers = Array.isArray(report.tester_names) ? report.tester_names : []
      const address = report.address || { street: '', suburb: '', state: '', postcode: '' }
      const cylinders = Array.isArray(report.cylinder_data) ? report.cylinder_data : []
      
      // Determine customer type - check if major_customer_id exists and is not null/empty
      const customerType = report.major_customer_id && report.major_customer_id !== null ? 'major' : 'regular'
      const majorCustomerId = (report.major_customer_id || '').toString()
      
      // Parse customer name
      let customerName = (report.customer || '').toString()
       
      if (customerType === 'major' && customerName.includes(' - ')) {
        const parts = customerName.split(' - ')
        customerName = (parts[1] || '').toString()
      } else if (customerType === 'major') {
        customerName = ''
      }
      // For regular customers, keep the full customer name as is
      
      // Get options with comprehensive fallbacks  
      const gasTypeOptions = (formDefaults?.gasTypes && Array.isArray(formDefaults.gasTypes) && formDefaults.gasTypes.length > 0) 
        ? formDefaults.gasTypes 
        : ['LPG', 'Compressed Air', 'Nitrogen', 'Other']
      
      const sizeOptions = (formDefaults?.cylinderSizes && Array.isArray(formDefaults.cylinderSizes) && formDefaults.cylinderSizes.length > 0)
        ? formDefaults.cylinderSizes 
        : ['4kg', '9kg', '15kg', '45kg', '90kg', '190kg', '210kg', 'Other']
      
      const supplierOptions = (formDefaults?.gasSuppliers && Array.isArray(formDefaults.gasSuppliers) && formDefaults.gasSuppliers.length > 0)
        ? formDefaults.gasSuppliers 
        : ['SUPAGAS', 'ELGAS', 'ORIGIN', 'BWA Gas', 'BOC', 'Air Liquide', 'Other']
      
      const vehicleOptions = (formDefaults?.vehicleIds && Array.isArray(formDefaults.vehicleIds) && formDefaults.vehicleIds.length > 0)
        ? formDefaults.vehicleIds 
        : ['BWA-01', 'BWA-02', 'BWA-03', 'BWA-04', 'BWA-05', 'BWA-06', 'BWA-07', 'BWA-08', 'BWA-TAS', 'Other']
      
      // Check if values are "Other" and need special handling
      const reportGasType = (report.gas_type || '').toString().trim()
      const gasType = gasTypeOptions.includes(reportGasType) ? reportGasType : (reportGasType ? 'Other' : 'LPG')
      const gasTypeOther = !gasTypeOptions.includes(reportGasType) && reportGasType ? reportGasType : ''
      
      const reportSize = (report.size || '').toString().trim()
      const size = sizeOptions.includes(reportSize) ? reportSize : (reportSize ? 'Other' : '')
      const sizeOther = !sizeOptions.includes(reportSize) && reportSize ? reportSize : ''
      
      const reportSupplier = (report.gas_supplier || '').toString().trim()
      const supplier = supplierOptions.includes(reportSupplier) ? reportSupplier : (reportSupplier ? 'Other' : '')
      const supplierOther = !supplierOptions.includes(reportSupplier) && reportSupplier ? reportSupplier : ''
      
      const reportVehicleId = (report.vehicle_id || '').toString().trim()
      const vehicleId = vehicleOptions.includes(reportVehicleId) ? reportVehicleId : (reportVehicleId ? 'Other' : '')
      const vehicleIdOther = !vehicleOptions.includes(reportVehicleId) && reportVehicleId ? reportVehicleId : ''
      
      console.log('Debug loading values:', {
        reportGasType, gasType, gasTypeOther,
        reportSize, size, sizeOther,
        reportSupplier, supplier, supplierOther,
        reportVehicleId, vehicleId, vehicleIdOther,
        customerType, majorCustomerId
      })
      
             // Ensure at least one cylinder
       const formattedCylinders = cylinders.length > 0 ? cylinders.map((cylinder: CylinderData) => ({
        cylinderNo: cylinder.cylinderNo || '',
        cylinderSpec: cylinder.cylinderSpec || '',
        wc: cylinder.wc || '',
        extExam: (cylinder.extExam === 'PASS' || cylinder.extExam === 'FAIL') ? cylinder.extExam : 'PASS',
        intExam: (cylinder.intExam === 'PASS' || cylinder.intExam === 'FAIL') ? cylinder.intExam : 'PASS',
        barcode: cylinder.barcode || '',
        remarks: cylinder.remarks || '',
        recordedBy: cylinder.recordedBy || '',
      })) : [{
        cylinderNo: '',
        cylinderSpec: '',
        wc: '',
        extExam: 'PASS' as const,
        intExam: 'PASS' as const,
        barcode: '',
        remarks: '',
        recordedBy: '',
      }]
      
      form.reset({
        customerType,
        majorCustomer: majorCustomerId || '',
        customerName: customerName || '',
        address: (address.street || '').toString(),
        suburb: (address.suburb || '').toString(),
        state: (address.state || '').toString(),
        postcode: (address.postcode || '').toString(),
        cylinder_gas_type: gasType || 'LPG',
        gasTypeOther: gasTypeOther || '',
        size: size || '',
        sizeOther: sizeOther || '',
        gas_supplier: supplier || '',
        supplierOther: supplierOther || '',
        test_date: report.test_date ? report.test_date.split('T')[0] : '',
        vehicleId: vehicleId || '',
        vehicleIdOther: vehicleIdOther || '',
        work_order: (report.work_order || '').toString(),
        primaryTester: (testers[0] || '').toString(),
        secondTester: (testers[1] && testers[1].trim() !== '') ? testers[1].toString() : 'none',
        thirdTester: (testers[2] && testers[2].trim() !== '') ? testers[2].toString() : 'none',
        cylinders: formattedCylinders,
      })
    }
  }, [report, form])

  const onSubmit = async (values: ReportFormData) => {
    try {
      // Transform form data to match API requirements
      const reportData = {
        id: reportId,
        customer: values.customerType === 'major' 
          ? values.customerName 
            ? `${majorCustomers.find(c => c.id === values.majorCustomer)?.name || values.majorCustomer} - ${values.customerName}`
            : majorCustomers.find(c => c.id === values.majorCustomer)?.name || values.majorCustomer || ''
          : values.customerName || '',
        address: {
          street: values.address,
          suburb: values.suburb,
          state: values.state,
          postcode: values.postcode,
        },
        gas_type: values.cylinder_gas_type === 'Other' ? values.gasTypeOther! : values.cylinder_gas_type,
        gas_supplier: values.gas_supplier === 'Other' ? values.supplierOther! : values.gas_supplier,
        size: values.size === 'Other' ? values.sizeOther! : values.size,
        test_date: values.test_date,
        tester_names: [values.primaryTester, values.secondTester, values.thirdTester]
          .filter((name): name is string => !!name && name !== 'none' && name !== ''),
        vehicle_id: values.vehicleId === 'Other' ? values.vehicleIdOther! : values.vehicleId,
        work_order: values.work_order,
        major_customer_id: values.customerType === 'major' ? values.majorCustomer : undefined,
        cylinder_data: values.cylinders,
      }

      await updateReportMutation.mutateAsync(reportData)
    } catch (error) {
      console.error('Error updating report:', error)
    }
  }

  const handlePreview = () => {
    const currentData = form.getValues()
    setPreviewData(currentData)
    setIsPreviewOpen(true)
  }

  // Filter testers to avoid duplicates (must be before conditional returns)
  const availableSecondTesters = useMemo(() => 
    testers.filter(tester => tester.name !== form.watch('primaryTester')), 
    [testers, form.watch('primaryTester')]
  )
  
  const availableThirdTesters = useMemo(() => 
    testers.filter(tester => tester.name !== form.watch('primaryTester') && tester.name !== form.watch('secondTester')), 
    [testers, form.watch('primaryTester'), form.watch('secondTester')]
  )

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

  // Watch form values for conditional rendering
  const customerType = form.watch('customerType')
  const majorCustomer = form.watch('majorCustomer')
  const cylinder_gas_type = form.watch('cylinder_gas_type')
  const size = form.watch('size')
  const gas_supplier = form.watch('gas_supplier')
  const vehicleId = form.watch('vehicleId')
  const primaryTester = form.watch('primaryTester')
  const secondTester = form.watch('secondTester')

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Report - {report.report_number}</h1>
        <Button asChild variant="outline">
          <Link href={`/reports/${reportId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Report
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Type Selection */}
              <FormField
                control={form.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regular">Regular Customer</SelectItem>
                        <SelectItem value="major">Major Customer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Major Customer Dropdown */}
              {customerType === 'major' && (
                <FormField
                  control={form.control}
                  name="majorCustomer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Major Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select major customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {majorCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Customer Name */}
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {customerType === 'major' ? 'Additional Info (Optional)' : 'Customer Name *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          customerType === 'major'
                            ? "Additional customer info (optional)"
                            : "Enter customer name"
                        }
                        disabled={customerType === 'major' && !majorCustomer}
                        autoComplete="organization"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address Fields */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter street address" autoComplete="street-address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter suburb" autoComplete="address-level2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                                              <SelectContent>
                        {(formDefaults?.stateOptions || []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode *</FormLabel>
                      <FormControl>
                        <Input placeholder="4-digit postcode" autoComplete="postal-code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gas Information */}
          <Card>
            <CardHeader>
              <CardTitle>Gas Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cylinder_gas_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gas type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(formDefaults?.gasTypes || ['LPG', 'Other']).map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {cylinder_gas_type === 'Other' && (
                    <FormField
                      control={form.control}
                      name="gasTypeOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Gas Type *</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify gas type" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cylinder Size *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cylinder size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(formDefaults?.cylinderSizes || []).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {size === 'Other' && (
                    <FormField
                      control={form.control}
                      name="sizeOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Size *</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify cylinder size" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="gas_supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Supplier *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gas supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(formDefaults?.gasSuppliers || []).map((supplier) => (
                              <SelectItem key={supplier} value={supplier}>
                                {supplier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {gas_supplier === 'Other' && (
                    <FormField
                      control={form.control}
                      name="supplierOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Supplier *</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify gas supplier" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Details */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="test_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle ID *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle ID" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(formDefaults?.vehicleIds || []).map((id) => (
                              <SelectItem key={id} value={id}>
                                {id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {vehicleId === 'Other' && (
                    <FormField
                      control={form.control}
                      name="vehicleIdOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Vehicle ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify vehicle ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="work_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Order *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter work order" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Testers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="primaryTester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Tester *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary tester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {testers.map((tester) => (
                            <SelectItem key={tester.id} value={tester.name}>
                              {tester.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondTester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Second Tester</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={!primaryTester}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select second tester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {availableSecondTesters.map((tester) => (
                            <SelectItem key={tester.id} value={tester.name}>
                              {tester.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thirdTester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Third Tester</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={!secondTester}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select third tester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {availableThirdTesters.map((tester) => (
                            <SelectItem key={tester.id} value={tester.name}>
                              {tester.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cylinder Data */}
          <Card>
            <CardHeader>
              <CardTitle>Cylinder Data</CardTitle>
            </CardHeader>
            <CardContent>
              <CylinderDataForm />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>

            <Button
              type="submit"
              disabled={updateReportMutation.status === 'pending'}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateReportMutation.status === 'pending' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              Review your changes before saving
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Warning Modal */}
      <Dialog open={showApprovalWarning} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Already Approved</DialogTitle>
            <DialogDescription>
              This report has been approved. To edit it, you must first unapprove it using the admin password. 
              The report will need to be re-approved after editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => router.push(`/reports/${reportId}`)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUnapprove}
              disabled={unapproveReportMutation.isPending || !adminPassword}
              variant="destructive"
            >
              {unapproveReportMutation.isPending ? 'Unapproving...' : 'Unapprove & Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
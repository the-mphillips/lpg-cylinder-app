"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { MultiImageUpload } from "@/components/ui/multi-image-upload"
import { EquipmentMultiSelect } from "@/components/ui/multi-select-combobox"
// Simple toast replacement for now
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    console.log(`${variant === 'destructive' ? 'ERROR' : 'INFO'}: ${title} - ${description}`)
  }
})
import { api } from "@/lib/trpc/client"
import { Save, RotateCcw, Eye } from "lucide-react"
import { CylinderDataForm } from "../components/cylinder-data-form"

const cylinderSchema = z.object({
  cylinderNo: z.string().optional(),
  cylinderSpec: z.string().optional(),
  wc: z.string().optional(),
  extExam: z.enum(["PASS", "FAIL"]).optional().default("PASS"),
  intExam: z.enum(["PASS", "FAIL"]).optional().default("PASS"),
  barcode: z.string().optional(),
  remarks: z.string().optional(),
  recordedBy: z.string().optional(),
});

const reportBaseSchema = z.object({
  customerType: z.string().optional(),
  majorCustomer: z.string().optional(),
  customerName: z.string().optional(),
  address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  cylinder_gas_type: z.string().optional(),
  gasTypeOther: z.string().optional(),
  size: z.string().optional(),
  sizeOther: z.string().optional(),
  gas_supplier: z.string().optional(),
  supplierOther: z.string().optional(),
  test_date: z.string().optional(),
  vehicleId: z.string().optional(),
  vehicleIdOther: z.string().optional(),
  work_order: z.string().optional(),
  primaryTester: z.string().optional(),
  secondTester: z.string().optional(),
  thirdTester: z.string().optional(),
  notes: z.string().optional(),
  equipment_used: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  cylinders: z.array(cylinderSchema).optional().default([{
    cylinderNo: '',
    cylinderSpec: '',
    wc: '',
    extExam: 'PASS',
    intExam: 'PASS',
    barcode: '',
    remarks: '',
    recordedBy: '',
  }]),
});

const finalReportSchema = reportBaseSchema.extend({
  customerType: z.string().min(1, "Required"),
  customerName: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  suburb: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  postcode: z.string().min(4, "Required").regex(/^\d{4}$/, "Must be 4 digits"),
  cylinder_gas_type: z.string().min(1, "Required"),
  size: z.string().min(1, "Required"),
  gas_supplier: z.string().min(1, "Required"),
  test_date: z.string().min(1, "Required"),
  vehicleId: z.string().min(1, "Required"),
  work_order: z.string().min(1, "Required"),
  primaryTester: z.string().min(1, "Required"),
  cylinders: z.array(
    cylinderSchema.extend({
      cylinderNo: z.string().min(1, "Required"),
      cylinderSpec: z.string().min(1, "Required"),
      wc: z.string().min(1, "Required"),
      extExam: z.enum(["PASS", "FAIL"]),
      intExam: z.enum(["PASS", "FAIL"]),
      barcode: z.string().min(1, "Required"),
    })
  ).min(1, "At least one cylinder is required")
   .max(25, "Maximum of 25 cylinders allowed per report (fits on 1 A4 page)"),
});

type ReportFormData = z.infer<typeof finalReportSchema>;

// Simple debounce function with cancel method
const debounce = (func: (values: ReportFormData) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout
  const debounced = (values: ReportFormData) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(values), delay)
  }
  debounced.cancel = () => clearTimeout(timeoutId)
  return debounced
}

// Remove hardcoded options - now fetched dynamically

export default function NewReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<ReportFormData | null>(null)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const [isDraft, setIsDraft] = useState(false);

  // Check for duplicate parameter
  const duplicateReportId = searchParams.get('duplicate')
  const isDuplicate = !!duplicateReportId

  // API queries
  const { data: majorCustomers = [] } = api.reports.getMajorCustomers.useQuery()
  const { data: testers = [] } = api.reports.getTesters.useQuery()
  const { data: nextReportNumber = '' } = api.reports.getNextReportNumber.useQuery()
  const { data: formDefaults } = api.settings.getFormDefaults.useQuery()
  
  // Duplicate query - only run if duplicating
  const { data: duplicateData } = api.reports.duplicate.useQuery(
    { reportId: duplicateReportId! }, 
    { enabled: isDuplicate }
  )

  // Mutations
  const createReportMutation = api.reports.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report created successfully",
      })
      localStorage.removeItem('newReportFormData')
      router.push('/dashboard')
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create report: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  // Initialize form with default values
  const form = useForm<ReportFormData>({
    resolver: zodResolver(isDraft ? reportBaseSchema : finalReportSchema),
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
      test_date: new Date().toISOString().split('T')[0],
      vehicleId: '',
      vehicleIdOther: '',
      work_order: '',
      primaryTester: '',
      secondTester: '',
      thirdTester: '',
      // Office-only fields
      notes: '',
      equipment_used: [],
      images: [],
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
  });

  // Re-validate form when switching between draft and final
  useEffect(() => {
    form.trigger();
  }, [isDraft, form]);

  // Auto-save functionality
  const debouncedSave = useMemo(
    () => debounce((values: ReportFormData) => {
      try {
        localStorage.setItem('newReportFormData', JSON.stringify(values))
        // Only show toast notification occasionally to reduce noise
        const shouldShowToast = Math.random() < 0.1 // 10% chance to show toast
        if (shouldShowToast) {
          toast({
            title: "Auto-saved",
            description: "Form data has been saved locally",
            variant: "default",
          })
        }
      } catch (error) {
        console.error('Error auto-saving form data:', error)
      }
    }, 3000), // Increased debounce time to 3 seconds
    [toast]
  )

  // Load saved data or duplicate report on mount (only once)
  useEffect(() => {
    // Prevent running if already completed initial load
    if (isInitialLoadComplete) return

    const loadInitialData = async () => {
      if (isDuplicate && duplicateData) {
        try {
          // Transform duplicate data to form format
          const address = duplicateData.address || {}
          const testers = Array.isArray(duplicateData.tester_names) ? duplicateData.tester_names : []
          const cylinders = Array.isArray(duplicateData.cylinder_data) ? duplicateData.cylinder_data : []
          
          // Determine customer type
          const customerType = duplicateData.major_customer_id ? 'major' : 'other'
          
          // Parse customer name for major customers
          let customerName = duplicateData.customer || ''
          let majorCustomer = ''
          
          if (customerType === 'major') {
            // Set the major customer ID (not name)
            majorCustomer = duplicateData.major_customer_id || ''
            
            if (customerName.includes(' - ')) {
              const parts = customerName.split(' - ')
              customerName = parts[1] || ''
            } else {
              customerName = ''
            }
          }

          const formData: ReportFormData = {
            customerType,
            majorCustomer,
            customerName,
            address: address.street || '',
            suburb: address.suburb || '',
            state: address.state || '',
            postcode: address.postcode || '',
            cylinder_gas_type: duplicateData.gas_type || 'LPG',
            gasTypeOther: '',
            size: duplicateData.size || '',
            sizeOther: '',
            gas_supplier: duplicateData.gas_supplier || '',
            supplierOther: '',
            test_date: new Date().toISOString().split('T')[0], // Use today's date for new report
            vehicleId: duplicateData.vehicle_id || '',
            vehicleIdOther: '',
            work_order: '', // Clear work order for new report
            primaryTester: testers[0] || '',
            secondTester: testers[1] || '',
            thirdTester: testers[2] || '',
            // Office-only fields (start fresh for duplicates)
            notes: '',
            equipment_used: [],
            images: [],
            cylinders: cylinders.length > 0 ? cylinders.map(c => ({
              ...c, 
              extExam: (c.extExam === "PASS" || c.extExam === "FAIL") ? c.extExam : 'PASS', 
              intExam: (c.intExam === "PASS" || c.intExam === "FAIL") ? c.intExam : 'PASS'
            })) : [{
              cylinderNo: '',
              cylinderSpec: '',
              wc: '',
              extExam: 'PASS' as const,
              intExam: 'PASS' as const,
              barcode: '',
              remarks: '',
              recordedBy: '',
            }],
          }

          form.reset(formData)
          // Clear any saved data to prevent conflicts
          localStorage.removeItem('newReportFormData')
          toast({
            title: "Duplicated",
            description: "Report data has been copied. Please review and update as needed.",
          })
        } catch (error) {
          console.error('Error loading duplicate report:', error)
          toast({
            title: "Error",
            description: "Failed to load duplicate report data",
            variant: "destructive",
          })
        }
      } else if (!isDuplicate) {
        // Load from localStorage only if not duplicating
        const savedData = localStorage.getItem('newReportFormData')
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData)
            form.reset(parsedData)
            toast({
              title: "Restored",
              description: "Previous form data has been restored",
            })
          } catch (error) {
            console.error('Error parsing saved form data:', error)
            localStorage.removeItem('newReportFormData')
          }
        }
      }
      
      // Mark initial load as complete
      setIsInitialLoadComplete(true)
    }

    // Only load data when we have the necessary data (for duplicates) or immediately (for non-duplicates)
    if (!isDuplicate || (isDuplicate && duplicateData && majorCustomers.length > 0)) {
      loadInitialData()
    }
  }, [isDuplicate, duplicateData, majorCustomers.length, isInitialLoadComplete]) // Simplified dependencies

  // Watch form values for auto-save (only after initial load is complete)
  const watchedValues = form.watch()
  useEffect(() => {
    if (isInitialLoadComplete && !isDuplicate) {
      // Only auto-save if it's not a duplicate (to avoid saving duplicate data)
      const hasAnyData = Object.values(watchedValues).some(value => {
        if (typeof value === 'string') return value.trim() !== ''
        if (Array.isArray(value)) return value.length > 0
        return value !== undefined && value !== null
      })
      
      if (hasAnyData) {
        debouncedSave(watchedValues)
      }
    }
    return () => debouncedSave.cancel()
  }, [watchedValues, debouncedSave, isInitialLoadComplete, isDuplicate, form, toast])

  const submitReport = async (values: ReportFormData, isDraft = false) => {
    try {
      // Validate for final submission if not a draft
      if (!isDraft) {
        const validationResult = finalReportSchema.safeParse(values)
        if (!validationResult.success) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required fields before submitting.",
            variant: "destructive",
          })
          return
        }
      }

      // Find major customer name for display
      const majorCustomerName = values.customerType === 'major' && values.majorCustomer
        ? majorCustomers.find(c => c.id === values.majorCustomer)?.name || ''
        : ''

      // Transform form data to match API requirements
      const baseData = {
        customer: values.customerType === 'major' 
          ? values.customerName 
            ? `${majorCustomerName} - ${values.customerName}`
            : majorCustomerName
          : values.customerName || '',
        address: {
          street: values.address || '',
          suburb: values.suburb || '',
          state: values.state || '',
          postcode: values.postcode || '',
        },
        gas_type: values.cylinder_gas_type === 'Other' ? values.gasTypeOther || '' : values.cylinder_gas_type || '',
        gas_supplier: values.gas_supplier === 'Other' ? values.supplierOther : values.gas_supplier,
        size: values.size === 'Other' ? values.sizeOther || '' : values.size || '',
        test_date: values.test_date || '',
        tester_names: [values.primaryTester, values.secondTester, values.thirdTester]
          .filter((name): name is string => !!name && name !== 'none'),
        vehicle_id: values.vehicleId === 'Other' ? values.vehicleIdOther || '' : values.vehicleId || '',
        work_order: values.work_order,
        major_customer_id: values.customerType === 'major' ? values.majorCustomer : undefined,
        cylinder_data: values.cylinders || [],
        equipment_used: values.equipment_used || [],
        notes: values.notes || '',
        images: values.images || [],
      }

      const reportData = { ...baseData, status: isDraft ? 'draft' : 'pending' } as const

      await createReportMutation.mutateAsync(reportData)
      
      toast({
        title: "Success",
        description: isDraft ? "Report saved as draft" : "Report submitted successfully",
      })
    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: "Error",
        description: `Failed to ${isDraft ? 'save draft' : 'submit report'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const onSubmit = (values: ReportFormData) => {
    submitReport(values, false)
  }

  const handleSaveAsDraft = () => {
    setIsDraft(true);
    form.handleSubmit((values) => submitReport(values, true))();
  };

  const handleFinalSubmit = () => {
    setIsDraft(false);
    form.handleSubmit(onSubmit)();
  };

  const handleReset = () => {
    // Temporarily disable auto-save during reset
    debouncedSave.cancel()
    setIsInitialLoadComplete(false)
    
    // Reset form to default values
    form.reset({
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
      test_date: new Date().toISOString().split('T')[0],
      vehicleId: '',
      vehicleIdOther: '',
      work_order: '',
      primaryTester: '',
      secondTester: '',
      thirdTester: '',
      // Office-only fields
      notes: '',
      equipment_used: [],
      images: [],
      cylinders: [{
        cylinderNo: '',
        cylinderSpec: '',
        wc: '',
        extExam: 'PASS' as const,
        intExam: 'PASS' as const,
        barcode: '',
        remarks: '',
        recordedBy: '',
      }],
    })
    
    localStorage.removeItem('newReportFormData')
    
    // Re-enable auto-save after a brief delay
    setTimeout(() => setIsInitialLoadComplete(true), 200)
    
    toast({
      title: "Reset",
      description: "Form has been reset",
    })
  }

  // Clear localStorage only if there's a duplicate parameter to prevent conflicts
  useEffect(() => {
    if (isDuplicate) {
      localStorage.removeItem('newReportFormData')
    }
  }, [isDuplicate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  const customerTypeValue = form.watch('customerType')
  const gasTypeValue = form.watch('cylinder_gas_type')
  const sizeValue = form.watch('size')
  const supplierValue = form.watch('gas_supplier')
  const vehicleIdValue = form.watch('vehicleId')
  const primaryTesterValue = form.watch('primaryTester')
  const secondTesterValue = form.watch('secondTester')

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">New Report</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information and Gas Information - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Customer Details - 3 columns */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Customer Details</CardTitle>
                  <div className="text-red-600 font-semibold">
                    Temporary Test Report Number: {nextReportNumber}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Type */}
                  <FormField
                    control={form.control}
                    name="customerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Type</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('majorCustomer', '')
                          form.setValue('customerName', '')
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="major">Major Customer</SelectItem>
                            <SelectItem value="other">Other/New</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Major Customer - only show if customer type is major */}
                  {customerTypeValue === 'major' && (
                    <FormField
                      control={form.control}
                      name="majorCustomer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Major Customer</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {customerTypeValue === 'major' ? 'Additional Customer Info' : 'Customer Name'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={
                              customerTypeValue === 'major' 
                                ? "Additional customer details (optional)" 
                                : "Enter customer name"
                            }
                            disabled={customerTypeValue === ''}
                            autoComplete="organization"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter address" 
                            autoComplete="street-address"
                            {...field} 
                          />
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
                          <FormLabel>Suburb</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter suburb" 
                              autoComplete="address-level2"
                              {...field} 
                            />
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
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              autoComplete="address-level1"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select state</option>
                              {(formDefaults?.stateOptions || []).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter 4-digit postcode" 
                              autoComplete="postal-code"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gas Information - 1 column */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Gas Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Gas Type */}
                  <FormField
                    control={form.control}
                    name="cylinder_gas_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Type</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value)
                          if (value !== 'Other') form.setValue('gasTypeOther', '')
                        }} value={field.value}>
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
                  {gasTypeValue === 'Other' && (
                    <FormField
                      control={form.control}
                      name="gasTypeOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Gas Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify gas type" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Size */}
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value)
                          if (value !== 'Other') form.setValue('sizeOther', '')
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(formDefaults?.cylinderSizes || []).map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {sizeValue === 'Other' && (
                    <FormField
                      control={form.control}
                      name="sizeOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Size</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify size" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Supplier */}
                  <FormField
                    control={form.control}
                    name="gas_supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value)
                          if (value !== 'Other') form.setValue('supplierOther', '')
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
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
                  {supplierValue === 'Other' && (
                    <FormField
                      control={form.control}
                      name="supplierOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Supplier</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify supplier" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Report Details */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="test_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vehicle ID */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle ID</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value)
                          if (value !== 'Other') form.setValue('vehicleIdOther', '')
                        }} value={field.value}>
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
                  {vehicleIdValue === 'Other' && (
                    <FormField
                      control={form.control}
                      name="vehicleIdOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Vehicle ID</FormLabel>
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
                      <FormLabel>Work Order</FormLabel>
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
                      <FormLabel>Primary Tester</FormLabel>
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!primaryTesterValue}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select second tester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {testers
                            .filter(tester => tester.name !== primaryTesterValue)
                            .map((tester) => (
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!secondTesterValue}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select third tester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {testers
                            .filter(tester => 
                              tester.name !== primaryTesterValue && 
                              tester.name !== secondTesterValue
                            )
                            .map((tester) => (
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

          {/* Office Information */}
          <Card>
            <CardHeader>
              <CardTitle>Office Information</CardTitle>
              <p className="text-sm text-muted-foreground">Internal notes and documentation (not included in printed reports)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Internal notes, findings, or additional information..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipment_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Used</FormLabel>
                    <FormControl>
                      <EquipmentMultiSelect
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Images</FormLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Upload photos of findings or conditions (for office reference only)
                    </div>
                    <FormControl>
                      <MultiImageUpload
                        value={field.value || []}
                        onChange={field.onChange}
                        maxFiles={10}
                        maxSizeMB={10}
                        onUploadStart={() => {
                          toast({
                            title: "Uploading",
                            description: "Uploading images..."
                          })
                        }}
                        onUploadComplete={(results) => {
                          toast({
                            title: "Images uploaded",
                            description: `${results.length} images uploaded successfully`
                          })
                        }}
                        onUploadError={(error) => {
                          toast({
                            title: "Upload failed",
                            description: error,
                            variant: "destructive"
                          })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Form
            </Button>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPreviewData(form.getValues())
                  setIsPreviewOpen(true)
                }}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveAsDraft}
                disabled={createReportMutation.status === 'pending'}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save as Draft
              </Button>
              
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={createReportMutation.status === 'pending'}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {createReportMutation.status === 'pending' ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>

          {/* Preview Modal */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report Preview</DialogTitle>
                <DialogDescription>
                  Preview of the report data before saving
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                  {previewData ? JSON.stringify(previewData, null, 2) : 'No data to preview'}
                </pre>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </Form>
    </div>
  )
} 
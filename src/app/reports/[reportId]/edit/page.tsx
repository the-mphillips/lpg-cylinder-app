"use client"

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Validation schema (reused from new report page)
const reportSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(4, 'Postcode is required'),
  cylinder_gas_type: z.string().min(1, 'Gas type is required'),
  gasTypeOther: z.string().optional(),
  size: z.string().min(1, 'Cylinder size is required'),
  sizeOther: z.string().optional(),
  gas_supplier: z.string().optional(),
  supplierOther: z.string().optional(),
  test_date: z.string().min(1, 'Test date is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  vehicleIdOther: z.string().optional(),
  work_order: z.string().optional(),
  primaryTester: z.string().min(1, 'Primary tester is required'),
  secondTester: z.string().optional(),
  thirdTester: z.string().optional(),
}).refine((data) => {
  if (data.cylinder_gas_type === 'Other' && !data.gasTypeOther) {
    return false
  }
  return true
}, {
  message: 'Please specify gas type',
  path: ['gasTypeOther'],
}).refine((data) => {
  if (data.size === 'Other' && !data.sizeOther) {
    return false
  }
  return true
}, {
  message: 'Please specify cylinder size',
  path: ['sizeOther'],
}).refine((data) => {
  if (data.gas_supplier === 'Other' && !data.supplierOther) {
    return false
  }
  return true
}, {
  message: 'Please specify gas supplier',
  path: ['supplierOther'],
}).refine((data) => {
  if (data.vehicleId === 'Other' && !data.vehicleIdOther) {
    return false
  }
  return true
}, {
  message: 'Please specify vehicle ID',
  path: ['vehicleIdOther'],
})

type ReportFormData = z.infer<typeof reportSchema>

// Option arrays (same as new report page)
const stateOptions = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'WA', label: 'WA' },
  { value: 'SA', label: 'SA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
]

const gasTypeOptions = ['LPG', 'Compressed Air', 'Nitrogen', 'Other']
const sizeOptions = ['9kg', '18kg', '45kg', 'Other']
const supplierOptions = ['Origin Energy', 'Kleenheat', 'Elgas', 'Other']
const vehicleOptions = ['BWA-01', 'BWA-02', 'BWA-03', 'BWA-04', 'BWA-05', 'BWA-TAS', 'Other']

// Simple toast replacement
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    console.log(`${variant === 'destructive' ? 'Error' : 'Success'}: ${title} - ${description}`)
  }
})

export default function EditReportPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string
  const { toast } = useToast()

  // API queries
  const { data: report, isLoading, error } = api.reports.getById.useQuery({ id: reportId })
  const { data: testers = [] } = api.reports.getTesters.useQuery()

  // Mutations
  const updateReportMutation = api.reports.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report updated successfully",
      })
      router.push(`/reports/${reportId}`)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update report: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  // Initialize form
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
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
    },
  })

  // Load report data into form when available
  useEffect(() => {
    if (report) {
      // Parse tester names (now an array from database)
      const testers = Array.isArray(report.tester_names) ? report.tester_names : []
      
      form.reset({
        customerName: report.customer || '',
        address: report.address?.street || '',
        suburb: report.address?.suburb || '',
        state: report.address?.state || '',
        postcode: report.address?.postcode || '',
        cylinder_gas_type: report.gas_type || 'LPG',
        gasTypeOther: '',
        size: report.size || '',
        sizeOther: '',
        gas_supplier: report.gas_supplier || '',
        supplierOther: '',
        test_date: report.test_date || '',
        vehicleId: report.vehicle_id || '',
        vehicleIdOther: '',
        work_order: report.work_order || '',
        primaryTester: testers[0] || '',
        secondTester: testers[1] || 'none',
        thirdTester: testers[2] || 'none',
      })
    }
  }, [report, form])

  const onSubmit = async (values: ReportFormData) => {
    try {
      // Transform form data to match API requirements
      const reportData = {
        id: reportId,
        customer: values.customerName,
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
          .filter((name): name is string => !!name && name !== 'none'),
        vehicle_id: values.vehicleId === 'Other' ? values.vehicleIdOther! : values.vehicleId,
        work_order: values.work_order,
        // Preserve existing cylinder data
        cylinder_data: report?.cylinder_data || [],
      }

      await updateReportMutation.mutateAsync(reportData)
    } catch (error) {
      console.error('Error updating report:', error)
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

  const gasTypeValue = form.watch('cylinder_gas_type')
  const sizeValue = form.watch('size')
  const supplierValue = form.watch('gas_supplier')
  const vehicleIdValue = form.watch('vehicleId')
  const primaryTesterValue = form.watch('primaryTester')
  const secondTesterValue = form.watch('secondTester')

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
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
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
                      <Input placeholder="Enter address" {...field} />
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
                        <Input placeholder="Enter suburb" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stateOptions.map((option) => (
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
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter 4-digit postcode" {...field} />
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
              <CardTitle>Gas Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cylinder_gas_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gas type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {gasTypeOptions.map((type) => (
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
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cylinder Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cylinder size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sizeOptions.map((size) => (
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
                          <FormLabel>Specify Cylinder Size</FormLabel>
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
                        <FormLabel>Gas Supplier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gas supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {supplierOptions.map((supplier) => (
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
                          <FormLabel>Specify Gas Supplier</FormLabel>
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
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="test_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Date</FormLabel>
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
                        <FormLabel>Vehicle ID</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle ID" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicleOptions.map((id) => (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
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
    </div>
  )
} 
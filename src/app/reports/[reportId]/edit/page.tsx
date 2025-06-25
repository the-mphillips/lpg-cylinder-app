"use client"

import { useParams, useRouter } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { api } from '@/lib/trpc/client'
import { useEffect } from 'react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CylinderDataForm } from '@/app/reports/components/cylinder-data-form'

const cylinderSchema = z.object({
  cylinderNo: z.string().default(''),
  barcode: z.string().default(''),
  cylinderSpec: z.string().default(''),
  wc: z.string().default(''),
  extExam: z.string().default('PASS'),
  intExam: z.string().default('PASS'),
  remarks: z.string().optional().default(''),
});

const reportSchema = z.object({
  id: z.string(),
  customer_name: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(4, 'Postcode is required'),
  cylinder_gas_type: z.string().min(1, 'Gas type is required'),
  gas_supplier: z.string().optional(),
  size: z.string().min(1, 'Cylinder size is required'),
  test_date: z.string().min(1, 'Test date is required'),
  tester_names: z.string().min(1, 'Tester name is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  work_order: z.string().optional(),
  major_customer_id: z.string().optional(),
  cylinders: z.array(cylinderSchema).optional().default([]),
});

type ReportFormValues = z.infer<typeof reportSchema>;

// Define a type for the raw cylinder data coming from the database
type DBCylinder = {
  cylinderNo?: string;
  barcode?: string;
  cylinderSpec?: string;
  wc?: string | number;
  extExam?: string;
  intExam?: string;
  remarks?: string;
}

export default function EditReportPage() {
  const router = useRouter()
  const params = useParams()
  const reportId = params.reportId as string

  const { data: report, isLoading, error } = api.reports.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId }
  )

  const updateReport = api.reports.update.useMutation({
    onSuccess: () => {
      router.push('/reports')
    },
    onError: (error) => {
      console.error("Failed to update report", error)
    },
  })

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      cylinders: [],
    }
  })

  useEffect(() => {
    if (report) {
      // The 'report' object from the DB has `cylinder_data` as a JSONB object.
      // The form expects `cylinders` as an array of objects.
      const formValues: ReportFormValues = {
        ...report,
        test_date: report.test_date ? format(new Date(report.test_date), 'yyyy-MM-dd') : '',
        cylinders: Array.isArray(report.cylinder_data) ? report.cylinder_data.map((c: DBCylinder) => ({
            cylinderNo: c.cylinderNo || '',
            barcode: c.barcode || '',
            cylinderSpec: c.cylinderSpec || '',
            wc: String(c.wc || ''),
            extExam: c.extExam || 'PASS',
            intExam: c.intExam || 'PASS',
            remarks: c.remarks || '',
        })) : [],
      };
      form.reset(formValues);
    }
  }, [report, form]);


  function onSubmit(values: ReportFormValues) {
    const { cylinders, ...rest } = values;
    const submissionData = {
      ...rest,
      cylinder_data: cylinders,
    };
    
    updateReport.mutate(submissionData);
  }

  if (isLoading) return <div>Loading report...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!report) return <div>Report not found.</div>

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Report #{report.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Customer Details Section */}
              <Card>
                <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="VIC">Victoria</SelectItem>
                            <SelectItem value="NSW">New South Wales</SelectItem>
                            <SelectItem value="QLD">Queensland</SelectItem>
                            <SelectItem value="WA">Western Australia</SelectItem>
                            <SelectItem value="SA">South Australia</SelectItem>
                            <SelectItem value="TAS">Tasmania</SelectItem>
                             <SelectItem value="ACT">Australian Capital Territory</SelectItem>
                             <SelectItem value="NT">Northern Territory</SelectItem>
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
                </CardContent>
              </Card>

              {/* Report Details Section */}
               <Card>
                <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="test_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Test Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={new Date(field.value)}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="work_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Order</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter work order #" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vehicle_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter vehicle ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tester_names"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tester Name(s)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter tester names, separated by commas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cylinder_gas_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., LPG" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cylinder Size</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 9kg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="gas_supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter gas supplier" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Cylinder Data Section */}
               <Card>
                <CardHeader><CardTitle>Cylinder Data</CardTitle></CardHeader>
                <CardContent>
                  <CylinderDataForm />
                </CardContent>
              </Card>

              <Button type="submit" disabled={updateReport.status === 'pending'}>
                {updateReport.status === 'pending' ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
} 
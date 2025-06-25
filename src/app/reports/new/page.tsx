"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, ControllerRenderProps } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/trpc/client"
import { useRouter } from "next/navigation"
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
import { CylinderDataForm } from "@/app/reports/components/cylinder-data-form"
import { FormProvider } from "react-hook-form"

// This schema can be imported from the router, but defining it here
// allows for client-side validation without pulling in server code.
const reportSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(4, 'Postcode is required'),
  cylinder_gas_type: z.string().min(1, 'Gas type is required'),
  gas_supplier: z.string().optional(),
  size: z.string().min(1, 'Cylinder size is required'),
  test_date: z.string().min(1, 'Test date is required'), // Will be a date picker
  tester_names: z.string().min(1, 'Tester name is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  work_order: z.string().optional(),
  major_customer_id: z.string().optional(),
  // A placeholder for the complex cylinder data object
  cylinder_data: z.record(z.any()).default({}), 
});

export default function NewReportPage() {
  const router = useRouter()
  const createReport = api.reports.create.useMutation({
    onSuccess: () => {
      // TODO: Add success notification (toast)
      router.push("/reports")
    },
    onError: (error) => {
      // TODO: Add error notification (toast)
      console.error("Failed to create report", error)
    },
  })

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      customer_name: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
      cylinder_gas_type: "LPG",
      gas_supplier: "",
      size: "",
      test_date: new Date().toISOString().split('T')[0],
      tester_names: "",
      vehicle_id: "",
      work_order: "",
      major_customer_id: "",
    },
  })

  function onSubmit(values: z.infer<typeof reportSchema>) {
    createReport.mutate(values)
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create New Report</CardTitle>
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
                    render={({ field }: { field: ControllerRenderProps<z.infer<typeof reportSchema>, "customer_name"> }) => (
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

              <Button type="submit" disabled={createReport.status === 'pending'}>
                {createReport.status === 'pending' ? "Saving..." : "Save Report"}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
} 
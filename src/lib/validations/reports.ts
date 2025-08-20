import { z } from 'zod'

export const createReportSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits').optional(),
  cylinder_gas_type: z.string().min(1, 'Gas type is required'),
  gas_supplier: z.string().optional(),
  size: z.string().min(1, 'Size is required'),
  date: z.string().min(1, 'Date is required'),
  tester_names: z.string().min(1, 'Tester names are required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  cylinder_data: z.string().min(1, 'Cylinder data is required'),
  work_order: z.string().optional(),
  major_customer_id: z.number().optional(),
})

export const updateReportSchema = createReportSchema.partial().extend({
  id: z.number(),
})

export const approveReportSchema = z.object({
  report_number: z.number(),
  signatory_name: z.string().min(1, 'Signatory name is required'),
})

export const submitReportSchema = z.object({
  report_number: z.number(),
})

export const sendReportEmailSchema = z.object({
  report_id: z.number(),
  recipient: z.string().email('Invalid email address'),
  body: z.string().min(1, 'Email body is required'),
})

export const reportSearchSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'approved']).default('all'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  tester: z.string().optional(),
  customer: z.string().optional(),
})

export const cylinderDataSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  serial_number: z.string().min(1, 'Serial number is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  manufacture_date: z.string().min(1, 'Manufacture date is required'),
  test_pressure: z.number().min(0, 'Test pressure must be positive'),
  working_pressure: z.number().min(0, 'Working pressure must be positive'),
  capacity: z.number().min(0, 'Capacity must be positive'),
  weight_empty: z.number().min(0, 'Empty weight must be positive'),
  weight_full: z.number().min(0, 'Full weight must be positive'),
  test_result: z.enum(['pass', 'fail']),
  notes: z.string().optional(),
})

// Modern cylinder data schema for unified report form
export const modernCylinderDataSchema = z.object({
  cylinderNo: z.string().min(1, 'Cylinder number is required'),
  cylinderSpec: z.string().min(1, 'Cylinder specification is required'),
  wc: z.string().min(1, 'Water capacity is required'),
  extExam: z.enum(['PASS', 'FAIL']),
  intExam: z.enum(['PASS', 'FAIL']),
  barcode: z.string().min(1, 'Barcode is required'),
  remarks: z.string().optional(),
  recordedBy: z.string().optional(),
})

// Maximum cylinders constant for reuse across the app
export const MAX_CYLINDERS_PER_REPORT = 25

// Array schema for cylinders with max limit
export const cylindersArraySchema = z.array(modernCylinderDataSchema)
  .min(1, 'At least one cylinder is required')
  .max(MAX_CYLINDERS_PER_REPORT, `Maximum of ${MAX_CYLINDERS_PER_REPORT} cylinders allowed per report (fits on 1 A4 page)`)

export const majorCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
})

export const updateMajorCustomerSchema = majorCustomerSchema.extend({
  id: z.number(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>
export type ApproveReportInput = z.infer<typeof approveReportSchema>
export type SubmitReportInput = z.infer<typeof submitReportSchema>
export type SendReportEmailInput = z.infer<typeof sendReportEmailSchema>
export type ReportSearchInput = z.infer<typeof reportSearchSchema>
export type CylinderDataInput = z.infer<typeof cylinderDataSchema>
export type MajorCustomerInput = z.infer<typeof majorCustomerSchema>
export type UpdateMajorCustomerInput = z.infer<typeof updateMajorCustomerSchema> 
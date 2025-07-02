"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Check, X } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MAX_CYLINDERS_PER_REPORT } from "@/lib/validations/reports"

interface PassFailButtonsProps {
  value: string
  onChange: (value: string) => void
  label: string
}

function PassFailButtons({ value, onChange, label }: PassFailButtonsProps) {
  return (
    <div className="space-y-2">
      <FormLabel className="text-sm font-medium">{label}</FormLabel>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value === 'PASS' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('PASS')}
          className={cn(
            "flex-1 gap-2",
            value === 'PASS' && "bg-green-600 hover:bg-green-700 text-white"
          )}
        >
          <Check className="h-4 w-4" />
          PASS
        </Button>
        <Button
          type="button"
          variant={value === 'FAIL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('FAIL')}
          className={cn(
            "flex-1 gap-2",
            value === 'FAIL' && "bg-red-600 hover:bg-red-700 text-white"
          )}
        >
          <X className="h-4 w-4" />
          FAIL
        </Button>
      </div>
    </div>
  )
}

interface TesterComboBoxProps {
  value: string
  onChange: (value: string) => void
  testers: Array<{ id: string; name: string }>
}

function TesterComboBox({ value, onChange, testers }: TesterComboBoxProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)

  return (
    <div className="space-y-2">
      {!showCustomInput ? (
        <Select 
          value={value} 
          onValueChange={(val) => {
            if (val === 'custom') {
              setShowCustomInput(true)
              onChange('')
            } else {
              onChange(val)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select recorder..." />
          </SelectTrigger>
          <SelectContent>
            {testers.map((tester) => (
              <SelectItem key={tester.id} value={tester.name}>
                {tester.name}
              </SelectItem>
            ))}
            <SelectItem value="custom">
              <span className="italic">Type custom name...</span>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Enter recorder name"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCustomInput(false)
              onChange('')
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

export function CylinderDataForm() {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "cylinders",
  })
  
  // Get testers for the recorded by field
  const { data: testers = [] } = api.reports.getTesters.useQuery()

  const addCylinder = () => {
    if (fields.length >= MAX_CYLINDERS_PER_REPORT) {
      return
    }
    append({
      cylinderNo: '',
      cylinderSpec: '',
      wc: '',
      extExam: 'PASS',
      intExam: 'PASS',
      barcode: '',
      remarks: '',
      recordedBy: '',
    })
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card key={field.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg">Cylinder {index + 1}</h4>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            
            {/* Compact layout - 2 rows max */}
            <div className="space-y-4">
              {/* Row 1: Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={control}
                  name={`cylinders.${index}.cylinderNo`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cylinder No. *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Cylinder #" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`cylinders.${index}.barcode`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Barcode" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`cylinders.${index}.cylinderSpec`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cylinder Spec *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Specification" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`cylinders.${index}.wc`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WC (Water Capacity) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="WC" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Testing Results & Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Pass/Fail buttons take 1 column each */}
                <FormField
                  control={control}
                  name={`cylinders.${index}.extExam`}
                  render={({ field }) => (
                    <FormItem>
                      <PassFailButtons
                        value={field.value}
                        onChange={field.onChange}
                        label="External Exam *"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`cylinders.${index}.intExam`}
                  render={({ field }) => (
                    <FormItem>
                      <PassFailButtons
                        value={field.value}
                        onChange={field.onChange}
                        label="Internal Exam *"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recorded by with combobox */}
                <FormField
                  control={control}
                  name={`cylinders.${index}.recordedBy`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recorded By</FormLabel>
                      <FormControl>
                        <TesterComboBox
                          value={field.value}
                          onChange={field.onChange}
                          testers={testers}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remarks takes remaining space */}
                <FormField
                  control={control}
                  name={`cylinders.${index}.remarks`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Additional remarks or notes" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                type="button"
                variant="outline"
                onClick={addCylinder}
                disabled={fields.length >= MAX_CYLINDERS_PER_REPORT}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Cylinder
                {fields.length >= MAX_CYLINDERS_PER_REPORT && ` (${fields.length}/${MAX_CYLINDERS_PER_REPORT})`}
              </Button>
            </div>
          </TooltipTrigger>
          {fields.length >= MAX_CYLINDERS_PER_REPORT && (
            <TooltipContent>
              <p>Maximum of {MAX_CYLINDERS_PER_REPORT} cylinders allowed per report (fits perfectly on 1 A4 page)</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
 
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
import { Card, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

export function CylinderDataForm() {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "cylinders",
  })

  return (
    <div>
      {fields.map((field, index) => (
        <Card key={field.id} className="mb-4">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Cylinder {index + 1}</h4>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <FormField
                control={control}
                name={`cylinders.${index}.cylinderNo`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder No.</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`cylinders.${index}.barcode`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`cylinders.${index}.cylinderSpec`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder Spec</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`cylinders.${index}.wc`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WC (kg)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`cylinders.${index}.extExam`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ext. Exam</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`cylinders.${index}.intExam`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Int. Exam</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`cylinders.${index}.remarks`}
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-3">
                    <FormLabel>Remarks</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ 
          cylinderNo: "", 
          cylinderSpec: "", 
          wc: "", 
          extExam: "PASS", 
          intExam: "PASS", 
          barcode: "", 
          remarks: "" 
        })}
      >
        Add Cylinder
      </Button>
    </div>
  )
}
 
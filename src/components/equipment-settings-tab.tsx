"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusCircle, Trash2, Edit } from "lucide-react"

import { api } from "@/lib/trpc/client"
import type { AppRouter } from "@/lib/trpc/routers/_app";
import { type inferRouterOutputs } from "@trpc/server";
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

const equipmentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  cost_price: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Cost must be a number." }).min(0, "Cost must be a positive number.").optional()
  ),
})

type EquipmentForm = z.infer<typeof equipmentFormSchema>
type RouterOutputs = inferRouterOutputs<AppRouter>;
type Equipment = RouterOutputs["equipment"]["list"][number]

function EquipmentUsageStats({ equipmentId }: { equipmentId: string }) {
  const { data: stats, isLoading } = api.equipment.getUsageStats.useQuery({ id: equipmentId });

  if (isLoading) {
    return <span>Loading...</span>;
  }

  if (!stats) {
    return <span>N/A</span>;
  }

  return (
    <>
      <div className="font-medium">{stats.totalUsage}</div>
      <div className="text-sm text-muted-foreground">
        ({stats.monthlyUsage} this month)
      </div>
    </>
  );
}

export function EquipmentSettingsTab() {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

  const utils = api.useUtils()

  const { data: equipmentList, isLoading } = api.equipment.list.useQuery()

  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      cost_price: 0,
    },
  })

  const createMutation = api.equipment.create.useMutation({
    onSuccess: async (data) => {
      toast.success(`Equipment "${data.name}" created.`)
      await utils.equipment.list.invalidate()
      setIsFormDialogOpen(false)
    },
    onError: (error) => {
      toast.error("Failed to create equipment", {
        description: error.message,
      })
    },
  })

  const updateMutation = api.equipment.update.useMutation({
    onSuccess: async (data) => {
      toast.success(`Equipment "${data.name}" updated.`)
      await utils.equipment.list.invalidate()
      setIsFormDialogOpen(false)
      setSelectedEquipment(null)
    },
    onError: (error) => {
      toast.error("Failed to update equipment", {
        description: error.message,
      })
    },
  })

  const deleteMutation = api.equipment.delete.useMutation({
    onSuccess: async () => {
      toast.success("Equipment deleted successfully.")
      await utils.equipment.list.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to delete equipment", {
        description: error.message,
      })
    },
  })

  const handleOpenDialog = (equipment: Equipment | null = null) => {
    setSelectedEquipment(equipment)
    if (equipment) {
      form.reset({
        name: equipment.name,
        description: equipment.description || "",
        cost_price: equipment.cost_price || 0,
      })
    } else {
      form.reset({
        name: "",
        description: "",
        cost_price: 0,
      })
    }
    setIsFormDialogOpen(true)
  }

  const onSubmit = (values: EquipmentForm) => {
    if (selectedEquipment) {
      updateMutation.mutate({ ...values, id: selectedEquipment.id })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Manage Equipment</h3>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEquipment ? "Edit" : "Create"} Equipment</DialogTitle>
            <DialogDescription>
              {selectedEquipment
                ? "Edit the details of the equipment."
                : "Add a new piece of equipment to the list."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Valve Assembly" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the equipment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFormDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : equipmentList && equipmentList.length > 0 ? (
              equipmentList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>${item.cost_price ? item.cost_price.toFixed(2) : '0.00'}</TableCell>
                  <TableCell>
                    <EquipmentUsageStats equipmentId={item.id} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the equipment {`'${item.name}'`}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: item.id })}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No equipment found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
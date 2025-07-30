"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"

interface Option {
  value: string
  label: string
}

interface MultiSelectComboboxProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  onCreate?: (value: string) => Promise<Option | null>
  className?: string
  placeholder?: string
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  onCreate,
  className,
  placeholder = "Select options...",
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Ensure selected is always an array
  const safeSelected = Array.isArray(selected) ? selected : []

  const handleSelect = (value: string) => {
    const newSelected = safeSelected.includes(value)
      ? safeSelected.filter((item) => item !== value)
      : [...safeSelected, value]
    onChange(newSelected)
  }

  const handleCreate = async () => {
    if (onCreate && searchTerm && !options.some(opt => opt.label.toLowerCase() === searchTerm.toLowerCase())) {
      const newOption = await onCreate(searchTerm)
      if (newOption) {
        handleSelect(newOption.value)
      }
      setSearchTerm("")
    }
  }
  
  const selectedLabels = safeSelected
    .map(value => options.find(option => option.value === value)?.label)
    .filter(Boolean)
    .join(", ")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {safeSelected.length > 0 ? selectedLabels : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Search or create..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {onCreate ? (
                <Button variant="ghost" className="w-full justify-start" onClick={handleCreate}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create &ldquo;{searchTerm}&rdquo;
                </Button>
              ) : (
                "No options found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    handleSelect(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Wrapper component for equipment specifically
export function EquipmentMultiSelect({
  value,
  onChange,
}: {
  value: string[]
  onChange: (value: string[]) => void
}) {
  const utils = api.useUtils()
  const { data: equipment = [], isLoading } = api.equipment.list.useQuery()
  const createMutation = api.equipment.create.useMutation({
    onSuccess: (newEquipment) => {
      toast.success(`${newEquipment.name} created successfully.`)
      // Invalidate and refetch the equipment list
      utils.equipment.list.invalidate()
    },
    onError: (error) => {
      toast.error("Failed to create equipment", {
        description: error.message,
      })
    },
  })

  const equipmentOptions = React.useMemo(() => {
    return equipment.map(e => ({ value: e.id, label: e.name }))
  }, [equipment])

  const handleCreate = async (name: string) => {
    try {
      const newEquipment = await createMutation.mutateAsync({ name })
      return { value: newEquipment.id, label: newEquipment.name }
    } catch {
      // Error is already handled by onError in useMutation
      return null
    }
  }

  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : []

  return (
    <div className="space-y-2">
      <MultiSelectCombobox
        options={equipmentOptions}
        selected={safeValue}
        onChange={onChange}
        onCreate={handleCreate}
        placeholder={isLoading ? "Loading equipment..." : "Select or create equipment..."}
        className="w-full"
      />
      {/* Show list of available equipment */}
      {equipment.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Available equipment: {equipment.map(e => e.name).join(', ')}
        </div>
      )}
    </div>
  )
}
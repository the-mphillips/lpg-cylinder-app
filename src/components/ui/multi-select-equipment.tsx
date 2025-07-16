'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface MultiSelectEquipmentProps {
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
  maxSelected?: number
}

export function MultiSelectEquipment({
  value = [],
  onChange,
  options = [],
  placeholder = "Select equipment...",
  className,
  disabled = false,
  maxSelected
}: MultiSelectEquipmentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const toggleOption = (option: string) => {
    if (disabled) return

    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : maxSelected && value.length >= maxSelected
        ? value
        : [...value, option]
    
    onChange(newValue)
  }

  const removeSelected = (option: string) => {
    if (disabled) return
    onChange(value.filter(v => v !== option))
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  const selectAll = () => {
    if (disabled) return
    const availableOptions = maxSelected 
      ? filteredOptions.slice(0, maxSelected)
      : filteredOptions
    onChange(availableOptions)
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between text-left font-normal",
          disabled && "opacity-50 cursor-not-allowed",
          value.length === 0 && "text-muted-foreground"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex flex-wrap gap-1 flex-1 mr-2">
          {value.length === 0 ? (
            <span>{placeholder}</span>
          ) : (
            <>
              {value.slice(0, 2).map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSelected(item)
                  }}
                >
                  {item}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {value.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{value.length - 2} more
                </Badge>
              )}
            </>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg">
          {/* Search Bar */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {filteredOptions.length > 0 && (
            <div className="p-2 border-b flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={Boolean(maxSelected && value.length >= maxSelected)}
                className="flex-1"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={value.length === 0}
                className="flex-1"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm ? `No equipment found matching "${searchTerm}"` : 'No equipment available'}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option)
                  const isDisabled = maxSelected && !isSelected && value.length >= maxSelected

                  return (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-sm cursor-pointer hover:bg-accent",
                        isSelected && "bg-accent",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !isDisabled && toggleOption(option)}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex-1 text-sm">{option}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer with selection count */}
          {value.length > 0 && (
            <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
              {value.length} selected
              {maxSelected && ` of ${maxSelected} max`}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
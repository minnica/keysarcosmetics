"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

export interface MultiComboboxOption {
  value: string
  label: string
}

interface MultiComboboxProps {
  options: MultiComboboxOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  selectedCountLabel?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function MultiCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  selectedCountLabel = "servicios seleccionados",
  disabled,
  id,
  className,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = search
    ? options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options
  const selectedOptions = options.filter((option) => value.includes(option.value))

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch("")
  }

  function toggleValue(optionValue: string) {
    onValueChange(
      value.includes(optionValue)
        ? value.filter((current) => current !== optionValue)
        : [...value, optionValue],
    )
  }

  const triggerLabel =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0]?.label ?? placeholder
        : `${selectedOptions.length} ${selectedCountLabel}`

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-options` : undefined}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id={id ? `${id}-options` : undefined}
        className="admin-popover w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
        align="start"
      >
        <div className="border-b p-2">
          <Input
            autoFocus
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const selected = value.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => toggleValue(option.value)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

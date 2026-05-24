"use client"
import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  disabled,
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options

  const selected = options.find((o) => o.value === value)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-[180px]"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
      >
        <div className="border-b p-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none",
                  value === option.value && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  if (option.value !== value) {
                    onValueChange(option.value)
                  }
                  setSearch("")
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

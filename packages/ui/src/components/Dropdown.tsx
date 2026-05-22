// Componente base Dropdown (sin lógica de negocio)
import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'

export interface DropdownItem {
  label: string
  onClick: () => void
  disabled?: boolean
}

export interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  className?: string
}

export function Dropdown({ trigger, items, className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative inline-block', className)} ref={ref}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 z-10 mt-1 min-w-[8rem] rounded-md border border-gray-200 bg-white shadow-lg">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => { item.onClick(); setOpen(false) }}
              disabled={item.disabled}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

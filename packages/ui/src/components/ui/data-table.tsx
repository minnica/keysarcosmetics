'use client'

import { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

const PAGE_SIZE_OPTIONS = [
  { label: '10', value: '10' },
  { label: '20', value: '20' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
  { label: 'Todos', value: 'all' },
]

interface DataTableLabels {
  records?: string
  all?: string
  results?: (count: number) => string
}

type ColumnAlignment = 'left' | 'center' | 'right'

type ColumnMeta = {
  align?: ColumnAlignment
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
  searchPlaceholder?: string
  pageSize?: number
  labels?: DataTableLabels
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'Sin resultados.',
  searchPlaceholder = 'Buscar...',
  pageSize = 20,
  labels,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSizeOption, setPageSizeOption] = useState(String(pageSize))

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    autoResetPageIndex: true,
  })

  function handlePageSizeChange(option: string) {
    setPageSizeOption(option)
    const size = option === 'all' ? 99999 : parseInt(option)
    table.setPageSize(size)
    table.setPageIndex(0)
  }

  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const totalFiltered = table.getFilteredRowModel().rows.length
  const showPagination = pageSizeOption !== 'all'
  const recordsLabel = (labels?.records ?? 'Registros').toUpperCase()
  const allLabel = (labels?.all ?? 'Todos').toUpperCase()
  const resultsLabel = labels?.results ?? ((count: number) => `${count} resultado${count !== 1 ? 's' : ''}`)

  return (
    <div className="space-y-3">
      {/* Búsqueda global y selector de filas */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <Input
            placeholder={searchPlaceholder.toUpperCase()}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 text-[0.9rem]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[0.82rem] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
            {recordsLabel}
          </span>
          <Select value={pageSizeOption} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-9 w-24 text-[0.88rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value === 'all' ? allLabel : opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div
        className="overflow-x-auto rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]"
      >
        <Table>
          <TableHeader className="[&_tr]:border-[#2c241c]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const align = (header.column.columnDef.meta as ColumnMeta | undefined)?.align
                  const headAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                  return (
                    <TableHead
                      key={header.id}
                      className={`${headAlignClass} uppercase text-[0.72rem] tracking-[0.14em] text-[#8c7357]`}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className={`flex w-full items-center gap-1 select-none transition-opacity hover:opacity-70 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}
                          onClick={() => header.column.toggleSorting()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-[#2c241c] hover:bg-[rgba(255,255,255,0.02)] data-[state=selected]:bg-[rgba(255,255,255,0.03)]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`border-[#2c241c] text-[0.88rem] text-[#d9d3ca] ${(cell.column.columnDef.meta as ColumnMeta | undefined)?.align === 'right' ? 'text-right' : (cell.column.columnDef.meta as ColumnMeta | undefined)?.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-[0.9rem] text-[#655746]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {emptyMessage.toUpperCase()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>
          {resultsLabel(totalFiltered).toUpperCase()}
        </p>
        {showPagination && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>
              {pageCount > 0 ? `${pageIndex + 1} / ${pageCount}` : '—'}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

import { describe, expect, expectTypeOf, it } from 'vitest'
import * as ui from './index'
import type { BadgeProps, ButtonProps, CalendarProps, ColumnDef, ComboboxOption, DateRange } from './index'

const runtimeExports = [
  'AlertDialog', 'AlertDialogAction', 'AlertDialogCancel', 'AlertDialogContent', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogHeader', 'AlertDialogOverlay', 'AlertDialogPortal', 'AlertDialogTitle', 'AlertDialogTrigger',
  'Badge', 'BaseToaster', 'Button', 'Calendar', 'Card', 'CardContent', 'CardDescription', 'CardFooter', 'CardHeader', 'CardTitle', 'Combobox', 'DataTable', 'DatePicker', 'DateRangePicker',
  'Dialog', 'DialogClose', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogOverlay', 'DialogPortal', 'DialogTitle', 'DialogTrigger',
  'Input', 'Label', 'Popover', 'PopoverAnchor', 'PopoverContent', 'PopoverTrigger', 'Progress', 'ProgressKeysar', 'Select', 'SelectContent', 'SelectGroup', 'SelectItem', 'SelectLabel', 'SelectScrollDownButton', 'SelectScrollUpButton', 'SelectSeparator', 'SelectTrigger', 'SelectValue', 'Separator', 'Sheet', 'SheetClose', 'SheetContent', 'SheetDescription', 'SheetFooter', 'SheetHeader', 'SheetOverlay', 'SheetPortal', 'SheetTitle', 'SheetTrigger',
  'Sidebar', 'SidebarContent', 'SidebarFooter', 'SidebarGroup', 'SidebarGroupAction', 'SidebarGroupContent', 'SidebarGroupLabel', 'SidebarHeader', 'SidebarInput', 'SidebarInset', 'SidebarMenu', 'SidebarMenuAction', 'SidebarMenuBadge', 'SidebarMenuButton', 'SidebarMenuItem', 'SidebarMenuSkeleton', 'SidebarMenuSub', 'SidebarMenuSubButton', 'SidebarMenuSubItem', 'SidebarProvider', 'SidebarRail', 'SidebarSeparator', 'SidebarTrigger', 'Skeleton',
  'Table', 'TableBody', 'TableCaption', 'TableCell', 'TableFooter', 'TableHead', 'TableHeader', 'TableRow', 'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Textarea', 'Toaster', 'Toast', 'ToastAction', 'ToastClose', 'ToastContent', 'ToastDescription', 'ToastPortal', 'ToastProvider', 'ToastTitle', 'ToastViewport', 'Tooltip', 'TooltipContent', 'TooltipProvider', 'TooltipTrigger',
  'baseToast', 'badgeVariants', 'buttonVariants', 'cn', 'createToastManager', 'toast', 'useIsMobile', 'useSidebar', 'useToastManager',
] as const

describe('barrel público de @cosmetics/ui', () => {
  it('expone cada símbolo de runtime como parte del contrato soportado', () => {
    expect(Object.keys(ui).sort()).toEqual([...runtimeExports].sort())
    for (const exported of runtimeExports) expect(ui[exported]).toBeDefined()
  })

  it('mantiene los contratos de tipos públicos', () => {
    expectTypeOf<ButtonProps>().toMatchTypeOf<React.ButtonHTMLAttributes<HTMLButtonElement>>()
    expectTypeOf<BadgeProps>().toMatchTypeOf<React.HTMLAttributes<HTMLDivElement>>()
    expectTypeOf<CalendarProps>().toMatchTypeOf<object>()
    expectTypeOf<ComboboxOption>().toMatchTypeOf<{ value: string; label: string }>()
    expectTypeOf<DateRange>().toMatchTypeOf<object | undefined>()
    expectTypeOf<ColumnDef<{ id: string }>>().toMatchTypeOf<object>()
  })
})

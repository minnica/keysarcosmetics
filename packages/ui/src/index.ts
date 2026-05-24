// Componentes shadcn/ui canonicos - Fase 1, 2A, 2B y 2E (DateRangePicker)

export { Button, buttonVariants } from './components/ui/button'
export type { ButtonProps } from './components/ui/button'

export { Input } from './components/ui/input'

export { Label } from './components/ui/label'

export { Textarea } from './components/ui/textarea'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/ui/card'

export { Badge, badgeVariants } from './components/ui/badge'
export type { BadgeProps } from './components/ui/badge'

// Fase 2D - Progress shadcn/ui canonico
export { Progress } from './components/ui/progress'

// Fase 2D - Wrapper con colores de marca Keysar
export { ProgressKeysar } from './components/custom/progress-keysar'

// Combobox — Select con búsqueda integrada
export { Combobox } from './components/custom/combobox'
export type { ComboboxOption } from './components/custom/combobox'

// Fase 2C - Select shadcn/ui canonico
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/ui/select'

// Fase 2B - Dialog shadcn/ui canonico
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog'

// Fase 2A - Table shadcn/ui canonico
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/ui/table'

// Fase 2E - Popover shadcn/ui canonico
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './components/ui/popover'

// Fase 2E - Calendar shadcn/ui canonico
export { Calendar } from './components/ui/calendar'
export type { CalendarProps } from './components/ui/calendar'

// Fase 2E - DateRangePicker shadcn/ui (Calendar + Popover)
export { DateRangePicker } from './components/ui/date-range-picker'
export type { DateRange } from './components/ui/date-range-picker'

// Fase 3 - Sheet shadcn/ui canonico
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet'

// Fase 3 - Tooltip shadcn/ui canonico
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip'

// Fase 3 - Separator canonico
export { Separator } from './components/ui/separator'

// Fase 3 - Sidebar oficial shadcn/ui canonico
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar'

// Fase 3 - Hook mobile
export { useIsMobile } from './hooks/use-mobile'

export { cn } from './lib/utils'

// AlertDialog shadcn/ui canónico
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './components/ui/alert-dialog'

// Sonner (Toaster) shadcn/ui canónico + toast helper
export { Toaster } from './components/ui/sonner'
export { toast } from 'sonner'

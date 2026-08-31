import { describe, expect, it } from 'vitest'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../..'
import { renderWithUser, screen } from '../../test/render'

describe('Tabs', () => {
  it('cambia el panel activo con teclado y conserva roles accesibles', async () => {
    const { user } = renderWithUser(
      <Tabs defaultValue="ventas">
        <TabsList aria-label="Reporte"><TabsTrigger value="ventas">Ventas</TabsTrigger><TabsTrigger value="citas">Citas</TabsTrigger></TabsList>
        <TabsContent value="ventas">Contenido ventas</TabsContent>
        <TabsContent value="citas">Contenido citas</TabsContent>
      </Tabs>,
    )
    const ventas = screen.getByRole('tab', { name: 'Ventas' })
    expect(ventas).toHaveAttribute('aria-selected', 'true')
    ventas.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Citas' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('tab', { name: 'Citas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido citas')
  })
})

describe('Popover y Tooltip', () => {
  it('abre y cierra el popover anclado al trigger', async () => {
    const { user } = renderWithUser(
      <Popover>
        <PopoverAnchor data-testid="anchor" />
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent>Opciones de filtro</PopoverContent>
      </Popover>,
    )
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(screen.getByText('Opciones de filtro')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Opciones de filtro')).not.toBeInTheDocument()
  })

  it('muestra ayuda al enfocar un trigger', async () => {
    const { user } = renderWithUser(
      <TooltipProvider delayDuration={0}>
        <Tooltip><TooltipTrigger>Ayuda</TooltipTrigger><TooltipContent>Información adicional</TooltipContent></Tooltip>
      </TooltipProvider>,
    )
    await user.tab()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Información adicional')
  })
})

describe('Sheet', () => {
  it('expone título, descripción y cierre accesibles', async () => {
    const { user } = renderWithUser(
      <Sheet>
        <SheetTrigger>Ver detalle</SheetTrigger>
        <SheetContent side="left">
          <SheetHeader><SheetTitle>Detalle</SheetTitle><SheetDescription>Información de la venta</SheetDescription></SheetHeader>
          <SheetFooter><SheetClose>Listo</SheetClose></SheetFooter>
        </SheetContent>
      </Sheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Ver detalle' }))
    expect(screen.getByRole('dialog', { name: 'Detalle', description: 'Información de la venta' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

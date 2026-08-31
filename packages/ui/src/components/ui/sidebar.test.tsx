import { describe, expect, it } from 'vitest'
import {
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
} from '../..'
import { renderWithUser, screen } from '../../test/render'

function SidebarFixture() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader>Encabezado</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operación</SidebarGroupLabel>
            <SidebarGroupAction aria-label="Agregar">+</SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Ventas">Ventas</SidebarMenuButton>
                  <SidebarMenuAction aria-label="Acciones" showOnHover>···</SidebarMenuAction>
                  <SidebarMenuBadge>3</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSub>
                  <SidebarMenuSubItem><SidebarMenuSubButton href="/reportes">Reportes</SidebarMenuSubButton></SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>Pie</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset><SidebarInput aria-label="Buscar" /><SidebarTrigger /></SidebarInset>
    </SidebarProvider>
  )
}

describe('Sidebar', () => {
  it('renderiza el árbol público y alterna con trigger, rail y atajo de teclado', async () => {
    const { user } = renderWithUser(<SidebarFixture />)
    const sidebar = screen.getByText('Operación').closest('[data-state]')

    expect(screen.getByText('Encabezado')).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reportes' })).toHaveAttribute('href', '/reportes')
    expect(document.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeTruthy()
    expect(sidebar).toHaveAttribute('data-state', 'expanded')

    const trigger = document.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')
    expect(trigger).toBeTruthy()
    await user.click(trigger!)
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    await user.click(trigger!)
    await user.keyboard('{Control>}b{/Control}')
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    await user.click(screen.getByLabelText('Toggle Sidebar'))
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
  })
})

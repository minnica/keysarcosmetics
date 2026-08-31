import { describe, expect, it } from 'vitest'
import {
  BaseToaster,
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  baseToast,
  createToastManager,
  toast,
  useToastManager,
} from '../..'
import { renderWithUser, screen } from '../../test/render'

describe('Toast', () => {
  it('muestra, acciona y cierra una notificación del manager público', async () => {
    const manager = createToastManager()
    const { user } = renderWithUser(<BaseToaster toastManager={manager} timeout={0} />)

    manager.add({ title: 'Cambios guardados', description: 'La sucursal fue actualizada.', type: 'success' })

    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument()
    expect(screen.getByText('La sucursal fue actualizada.')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="toast-icon"]')).toBeTruthy()
    const closeButton = document.querySelector<HTMLButtonElement>('[data-slot="toast-close"]')
    expect(closeButton).toBeTruthy()
    await user.click(closeButton!)
    expect(screen.queryByText('Cambios guardados')).not.toBeInTheDocument()
  })

  it('conserva los primitives para composiciones controladas y el Toaster de Sonner', () => {
    const manager = createToastManager()
    const id = manager.add({ title: 'Aviso', description: 'Pendiente', type: 'warning' })
    manager.update(id, { title: 'Actualizado' })
    manager.close(id)

    renderWithUser(
      <>
        <Toaster />
        <ToastProvider toastManager={manager}>
          <ToastPortal><ToastViewport><Toast toast={{ id: 'manual', title: 'Manual', description: 'Compuesto' } as never}><ToastContent><ToastTitle /><ToastDescription /><ToastAction /><ToastClose /></ToastContent></Toast></ToastViewport></ToastPortal>
        </ToastProvider>
      </>,
    )

    expect(toast).toBeTypeOf('function')
    expect(baseToast).toHaveProperty('add')
    expect(useToastManager).toBeTypeOf('function')
  })
})

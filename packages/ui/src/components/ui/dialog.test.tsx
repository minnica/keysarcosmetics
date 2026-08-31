import { describe, expect, it, vi } from 'vitest'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { renderWithUser, screen } from '../../test/render'

function DialogFixture({ onClose = vi.fn() }: { onClose?: () => void }) {
  return (
    <Dialog>
      <DialogTrigger>Abrir perfil</DialogTrigger>
      <DialogContent>
        <DialogTitle>Editar perfil</DialogTitle>
        <DialogDescription>Actualiza los datos del perfil.</DialogDescription>
        <input aria-label="Nombre" />
        <DialogClose onClick={onClose}>Guardar y cerrar</DialogClose>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('abre con nombre y descripcion accesibles y administra el foco', async () => {
    const { user } = renderWithUser(<DialogFixture />)
    const trigger = screen.getByRole('button', { name: 'Abrir perfil' })

    await user.click(trigger)
    expect(
      screen.getByRole('dialog', {
        name: 'Editar perfil',
        description: 'Actualiza los datos del perfil.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('cierra mediante una accion compuesta', async () => {
    const onClose = vi.fn()
    const { user } = renderWithUser(<DialogFixture onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Abrir perfil' }))
    await user.click(screen.getByRole('button', { name: 'Guardar y cerrar' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

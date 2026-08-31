import { describe, expect, it, vi } from 'vitest'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog'
import { renderWithUser, screen } from '../../test/render'

function AlertDialogFixture({
  onConfirm = vi.fn(),
}: {
  onConfirm?: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Eliminar registro</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
        <AlertDialogDescription>
          Esta accion no se puede deshacer.
        </AlertDialogDescription>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  )
}

describe('AlertDialog', () => {
  it('expone el contrato accesible y cancela sin confirmar', async () => {
    const onConfirm = vi.fn()
    const { user } = renderWithUser(
      <AlertDialogFixture onConfirm={onConfirm} />,
    )
    const trigger = screen.getByRole('button', { name: 'Eliminar registro' })

    await user.click(trigger)
    expect(
      screen.getByRole('alertdialog', {
        name: 'Confirmar eliminacion',
        description: 'Esta accion no se puede deshacer.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('distingue la accion de confirmacion', async () => {
    const onConfirm = vi.fn()
    const { user } = renderWithUser(
      <AlertDialogFixture onConfirm={onConfirm} />,
    )

    await user.click(screen.getByRole('button', { name: 'Eliminar registro' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

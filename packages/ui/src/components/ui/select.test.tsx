import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import { renderWithUser, screen } from '../../test/render'

function SelectFixture({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('')
  return (
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger aria-label="Sucursal">
        <SelectValue placeholder="Selecciona una sucursal" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="centro">Centro</SelectItem>
        <SelectItem value="norte">Norte</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('Select', () => {
  it('abre, selecciona una opcion y actualiza el valor', async () => {
    const { user } = renderWithUser(<SelectFixture />)
    const trigger = screen.getByRole('combobox', { name: 'Sucursal' })

    expect(trigger).toHaveTextContent('Selecciona una sucursal')
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: 'Norte' }))
    expect(trigger).toHaveTextContent('Norte')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('permite seleccionar con teclado y devuelve el foco al trigger', async () => {
    const { user } = renderWithUser(<SelectFixture />)
    const trigger = screen.getByRole('combobox', { name: 'Sucursal' })

    trigger.focus()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(trigger).toHaveTextContent('Centro')
    expect(trigger).toHaveFocus()
  })

  it('respeta disabled', async () => {
    const { user } = renderWithUser(<SelectFixture disabled />)
    const trigger = screen.getByRole('combobox', { name: 'Sucursal' })

    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

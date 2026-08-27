import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxOption } from './combobox'
import { renderWithUser, screen } from '../../test/render'

const options: ComboboxOption[] = [
  { value: 'centro', label: 'Sucursal Centro' },
  { value: 'norte', label: 'Sucursal Norte' },
  { value: 'sur', label: 'Sucursal Sur' },
]

function ControlledCombobox() {
  const [value, setValue] = useState('')
  return (
    <>
      <label htmlFor="controlled-branch">Sucursal</label>
      <Combobox
        id="controlled-branch"
        options={options}
        value={value}
        onValueChange={setValue}
      />
    </>
  )
}

describe('Combobox', () => {
  it('abre, filtra, muestra el estado vacio y limpia la busqueda al cerrar', async () => {
    const { user } = renderWithUser(
      <>
        <label htmlFor="filter-branch">Sucursal</label>
        <Combobox
          id="filter-branch"
          options={options}
          value=""
          onValueChange={vi.fn()}
          searchPlaceholder="Buscar sucursal"
          emptyMessage="No hay sucursales"
        />
      </>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Sucursal' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const search = screen.getByPlaceholderText('Buscar sucursal')
    await user.type(search, 'inexistente')
    expect(screen.getByText('No hay sucursales')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(screen.getByPlaceholderText('Buscar sucursal')).toHaveValue('')
    expect(
      screen.getByRole('button', { name: 'Sucursal Norte' }),
    ).toBeInTheDocument()
  })

  it('selecciona una opcion con mouse y refleja el valor controlado', async () => {
    const { user } = renderWithUser(<ControlledCombobox />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('button', { name: 'Sucursal Norte' }))

    const trigger = screen.getByRole('combobox', { name: 'Sucursal' })
    expect(trigger).toHaveTextContent('Sucursal Norte')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('permite buscar y seleccionar con teclado', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithUser(
      <>
        <label htmlFor="keyboard-branch">Sucursal</label>
        <Combobox
          id="keyboard-branch"
          options={options}
          value=""
          onValueChange={onValueChange}
        />
      </>,
    )

    await user.click(screen.getByRole('combobox', { name: 'Sucursal' }))
    await user.type(screen.getByPlaceholderText('Buscar...'), 'sur')
    await user.tab()
    await user.keyboard('{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('sur')
  })

  it('respeta disabled', async () => {
    const { user } = renderWithUser(
      <>
        <label htmlFor="disabled-branch">Sucursal</label>
        <Combobox
          id="disabled-branch"
          options={options}
          value=""
          onValueChange={vi.fn()}
          disabled
        />
      </>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Sucursal' })
    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument()
  })
})

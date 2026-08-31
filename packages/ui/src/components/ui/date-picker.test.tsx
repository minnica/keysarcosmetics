import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './date-picker'
import { renderWithUser, screen } from '../../test/render'
import { getCalendarDay } from '../../test/calendar'

function ControlledDatePicker({
  initialValue = '',
}: {
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)
  return <DatePicker value={value} onChange={setValue} />
}

describe('DatePicker', () => {
  it('muestra el placeholder y respeta disabled', async () => {
    const { user } = renderWithUser(
      <DatePicker
        value=""
        onChange={vi.fn()}
        placeholder="Fecha de venta"
        disabled
      />,
    )

    const trigger = screen.getByRole('button', { name: /fecha de venta/i })
    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('representa una fecha ISO sin desplazarla por timezone', () => {
    renderWithUser(<DatePicker value="2025-08-01" onChange={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /01\/08\/2025/ }),
    ).toBeInTheDocument()
  })

  it('abre, navega, selecciona y cierra el calendario con el valor ISO esperado', async () => {
    const onChange = vi.fn()
    const { user } = renderWithUser(
      <DatePicker value="2025-08-10" onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: /10\/08\/2025/ }))
    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getByText('August 2025')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /go to next month/i }))
    expect(screen.getByText('September 2025')).toBeInTheDocument()

    await user.click(getCalendarDay('15'))
    expect(onChange).toHaveBeenCalledWith('2025-09-15')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('actualiza el valor cuando se usa como componente controlado', async () => {
    const { user } = renderWithUser(
      <ControlledDatePicker initialValue="2025-08-10" />,
    )

    await user.click(screen.getByRole('button', { name: /10\/08\/2025/ }))
    await user.click(getCalendarDay('15'))

    expect(
      screen.getByRole('button', { name: /15\/08\/2025/ }),
    ).toBeInTheDocument()
  })
})

import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Calendar } from './calendar'
import { renderWithUser, screen } from '../../test/render'
import { getCalendarDay } from '../../test/calendar'

function ControlledCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(
    new Date(2025, 7, 10),
  )
  return (
    <Calendar
      mode="single"
      defaultMonth={new Date(2025, 7, 1)}
      selected={selected}
      onSelect={setSelected}
      disabled={new Date(2025, 7, 20)}
    />
  )
}

describe('Calendar', () => {
  it('navega entre meses y notifica el cambio', async () => {
    const onMonthChange = vi.fn()
    const { user } = renderWithUser(
      <Calendar
        defaultMonth={new Date(2025, 7, 1)}
        onMonthChange={onMonthChange}
      />,
    )

    expect(screen.getByText('August 2025')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /go to next month/i }))

    expect(screen.getByText('September 2025')).toBeInTheDocument()
    expect(onMonthChange).toHaveBeenCalledWith(expect.any(Date))
  })

  it('selecciona dias, conserva el estado visual y respeta dias deshabilitados', async () => {
    const { user } = renderWithUser(<ControlledCalendar />)

    expect(getCalendarDay('10')).toHaveAttribute('aria-selected', 'true')
    await user.click(getCalendarDay('15'))
    expect(getCalendarDay('15')).toHaveAttribute('aria-selected', 'true')
    expect(getCalendarDay('20', { disabled: true })).toBeDisabled()
  })

  it('combina className y classNames publicos', () => {
    const { container } = renderWithUser(
      <Calendar
        defaultMonth={new Date(2025, 7, 1)}
        className="calendar-contract"
        classNames={{ day_selected: 'selected-contract' }}
        mode="single"
        selected={new Date(2025, 7, 10)}
      />,
    )

    expect(container.querySelector('.calendar-contract')).toBeInTheDocument()
    expect(getCalendarDay('10')).toHaveClass('selected-contract')
  })
})

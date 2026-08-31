import { describe, expect, it, vi } from 'vitest'
import { DateRangePicker } from './date-range-picker'
import { renderWithUser, screen } from '../../test/render'
import { getCalendarDay } from '../../test/calendar'

describe('DateRangePicker', () => {
  it('representa rangos vacios, parciales y completos', () => {
    const { rerender } = renderWithUser(
      <DateRangePicker
        value={{ from: '', to: '' }}
        onChange={vi.fn()}
        fromLabel="Desde"
        toLabel="Hasta"
      />,
    )

    expect(screen.getByRole('button', { name: 'Desde' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hasta' })).toBeInTheDocument()

    rerender(
      <DateRangePicker
        value={{ from: '2025-08-10', to: '' }}
        onChange={vi.fn()}
        fromLabel="Desde"
        toLabel="Hasta"
      />,
    )
    expect(
      screen.getByRole('button', { name: /10\/08\/2025/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hasta' })).toBeInTheDocument()

    rerender(
      <DateRangePicker
        value={{ from: '2025-08-10', to: '2025-08-20' }}
        onChange={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: /10\/08\/2025/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /20\/08\/2025/ }),
    ).toBeInTheDocument()
  })

  it('normaliza el limite final cuando la nueva fecha inicial queda despues', async () => {
    const onChange = vi.fn()
    const { user } = renderWithUser(
      <DateRangePicker
        value={{ from: '2025-08-10', to: '2025-08-20' }}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /10\/08\/2025/ }))
    await user.click(getCalendarDay('25'))

    expect(onChange).toHaveBeenCalledWith({
      from: '2025-08-25',
      to: '2025-08-25',
    })
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('normaliza el limite inicial cuando la nueva fecha final queda antes', async () => {
    const onChange = vi.fn()
    const { user } = renderWithUser(
      <DateRangePicker
        value={{ from: '2025-08-10', to: '2025-08-20' }}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /20\/08\/2025/ }))
    await user.click(getCalendarDay('5'))

    expect(onChange).toHaveBeenCalledWith({
      from: '2025-08-05',
      to: '2025-08-05',
    })
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })
})

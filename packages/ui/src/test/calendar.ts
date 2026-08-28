import { screen } from '@testing-library/react'

interface CalendarDayOptions {
  disabled?: boolean
}

export function getCalendarDay(
  day: string,
  { disabled = false }: CalendarDayOptions = {},
) {
  const cell = screen.getAllByRole('gridcell').find((candidate) => {
    const isOutsideDay = candidate.classList.contains('day-outside')
    const isDisabled = candidate.hasAttribute('disabled')

    return (
      candidate.textContent === day &&
      !isOutsideDay &&
      isDisabled === disabled
    )
  })

  if (!cell) {
    throw new Error(
      `No se encontró el día ${day}${disabled ? ' deshabilitado' : ' habilitado'}`,
    )
  }

  return cell
}

import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './input'
import { renderWithUser, screen } from '../../test/render'

function ControlledNumberInput() {
  const [value, setValue] = useState(0)

  return (
    <Input
      aria-label="Cantidad"
      type="number"
      value={value}
      onChange={(event) => setValue(Number(event.currentTarget.value))}
    />
  )
}

describe('Input', () => {
  it('conserva vacío un número controlado mientras el usuario captura otro valor', async () => {
    const { user } = renderWithUser(<ControlledNumberInput />)
    const input = screen.getByRole('spinbutton', { name: 'Cantidad' })

    await user.click(input)
    await user.clear(input)
    expect(input).toHaveValue(null)

    await user.type(input, '25')
    expect(input).toHaveValue(25)
  })

  it('preserva los handlers de foco de quien consume el componente', async () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const { user } = renderWithUser(
      <Input aria-label="Importe" onFocus={onFocus} onBlur={onBlur} />,
    )

    await user.click(screen.getByRole('textbox', { name: 'Importe' }))
    await user.tab()

    expect(onFocus).toHaveBeenCalledOnce()
    expect(onBlur).toHaveBeenCalledOnce()
  })
})

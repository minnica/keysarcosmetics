import type { ReactElement } from 'react'
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'

export function renderWithUser(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult & { user: UserEvent } {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  }
}

export * from '@testing-library/react'

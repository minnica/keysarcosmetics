import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, value, onChange, onFocus, onBlur, ...props }, ref) => {
    const isControlledNumber = type === 'number' && value !== undefined
    const [numberDraft, setNumberDraft] = React.useState<string | null>(null)
    const [numberFocused, setNumberFocused] = React.useState(false)

    React.useEffect(() => {
      if (!isControlledNumber || numberDraft === null) return

      const valueIsZero = value === 0 || value === '0' || value === ''
      const emptyDraftMatchesZero = numberDraft === '' && valueIsZero
      const numericDraft = Number(numberDraft)
      const numericValue = Number(value)
      const draftMatchesValue =
        numberDraft !== '' &&
        Number.isFinite(numericDraft) &&
        Number.isFinite(numericValue) &&
        numericDraft === numericValue

      if (numberFocused) {
        if (!emptyDraftMatchesZero && !draftMatchesValue) {
          setNumberDraft(String(value ?? ''))
        }
        return
      }

      if (!emptyDraftMatchesZero) setNumberDraft(null)
    }, [isControlledNumber, numberDraft, numberFocused, value])

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        value={isControlledNumber && numberDraft !== null ? numberDraft : value}
        onFocus={(event) => {
          if (isControlledNumber) {
            setNumberFocused(true)
            setNumberDraft((current) =>
              current === '' ? '' : String(value ?? '')
            )
          }
          onFocus?.(event)
        }}
        onChange={(event) => {
          if (isControlledNumber) {
            setNumberDraft(event.currentTarget.value)
          }
          onChange?.(event)
        }}
        onBlur={(event) => {
          if (isControlledNumber) {
            setNumberFocused(false)
            setNumberDraft(event.currentTarget.value === '' ? '' : null)
          }
          onBlur?.(event)
        }}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }

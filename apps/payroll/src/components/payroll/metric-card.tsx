import { Card, CardContent } from '@cosmetics/ui'

interface MetricCardProps {
  label: string
  value: string
  detail: string
  tone?: 'gold' | 'sage' | 'rose' | 'blue'
}

const TONE_CLASS: Record<NonNullable<MetricCardProps['tone']>, string> = {
  gold: 'from-[#0b0a09] via-[#080706] to-[#050404]',
  sage: 'from-[#0b0a09] via-[#080706] to-[#050404]',
  rose: 'from-[#0b0a09] via-[#080706] to-[#050404]',
  blue: 'from-[#0b0a09] via-[#080706] to-[#050404]',
}

export function MetricCard({ label, value, detail, tone = 'gold' }: MetricCardProps) {
  return (
    <Card className={`payroll-glass overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br ${TONE_CLASS[tone]}`}>
      <CardContent className="p-5">
        <p className="label-caps">{label}</p>
        <p className="number-display mt-4 text-3xl font-black text-[color:var(--payroll-ivory)]">{value}</p>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">{detail}</p>
      </CardContent>
    </Card>
  )
}

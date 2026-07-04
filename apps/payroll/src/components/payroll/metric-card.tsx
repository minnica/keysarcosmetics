import { Card, CardContent } from '@cosmetics/ui'

interface MetricCardProps {
  label: string
  value: string
  detail: string
  tone?: 'gold' | 'sage' | 'rose' | 'blue'
}

const TONE_CLASS: Record<NonNullable<MetricCardProps['tone']>, string> = {
  gold: 'from-[#d2b48c]/35 to-[#fffaf3]/70',
  sage: 'from-[#6f8f78]/24 to-[#fffaf3]/70',
  rose: 'from-[#d8a99b]/28 to-[#fffaf3]/70',
  blue: 'from-[#6e9aa7]/24 to-[#fffaf3]/70',
}

export function MetricCard({ label, value, detail, tone = 'gold' }: MetricCardProps) {
  return (
    <Card className={`payroll-glass overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br ${TONE_CLASS[tone]}`}>
      <CardContent className="p-5">
        <p className="label-caps">{label}</p>
        <p className="number-display mt-4 text-3xl font-black text-[color:var(--payroll-ink)]">{value}</p>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">{detail}</p>
      </CardContent>
    </Card>
  )
}

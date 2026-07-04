interface MetricCardProps {
  label: string
  value: string
  tone?: 'gold' | 'sage' | 'rose' | 'blue'
}

export function MetricCard({ label, value, tone = 'gold' }: MetricCardProps) {
  return (
    <div data-tone={tone} className="payroll-login-card overflow-hidden rounded-[2rem] p-5">
      <p className="label-caps">{label}</p>
      <p className="number-display mt-4 text-[1.7rem] font-black text-[color:var(--text-strong)]">{value}</p>
    </div>
  )
}

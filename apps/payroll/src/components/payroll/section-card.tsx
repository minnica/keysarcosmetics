import { Card, CardContent, CardHeader, CardTitle } from '@cosmetics/ui'

interface SectionCardProps {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SectionCard({ eyebrow, title, description, action, children }: SectionCardProps) {
  return (
    <Card className="payroll-glass rounded-[2rem] border-0">
      <CardHeader className="flex flex-col gap-4 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? <p className="label-caps mb-2">{eyebrow}</p> : null}
          <CardTitle className="section-heading text-[color:var(--payroll-ink)]">{title}</CardTitle>
          {description ? <p className="mt-2 max-w-3xl text-sm text-[color:var(--text-muted)]">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

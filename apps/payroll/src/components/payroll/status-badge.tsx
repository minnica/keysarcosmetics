import { Badge } from '@cosmetics/ui'

type Status = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'PENDING' | 'REJECTED' | 'LOST' | 'GENERATED' | 'SENT' | 'CONFIRMED'

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: 'BORRADOR',
  CALCULATED: 'CALCULADA',
  APPROVED: 'APROBADA',
  PAID: 'PAGADA',
  PENDING: 'PENDIENTE',
  REJECTED: 'RECHAZADO',
  LOST: 'PERDIDO',
  GENERATED: 'GENERADO',
  SENT: 'ENVIADO',
  CONFIRMED: 'CONFIRMADO',
}

const STATUS_CLASSES: Record<Status, string> = {
  DRAFT: 'border-[var(--border-color)] bg-[var(--accent-hover)] text-[var(--text-primary)]',
  CALCULATED: 'border-blue-brand-light/60 bg-blue-brand-soft/40 text-[var(--text-primary)]',
  APPROVED: 'border-green-sage/60 bg-green-sage/25 text-[var(--text-primary)]',
  PAID: 'border-green-olive/60 bg-green-olive/25 text-[var(--text-primary)]',
  PENDING: 'border-gold/60 bg-gold/20 text-[var(--text-primary)]',
  REJECTED: 'border-red-400/60 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  LOST: 'border-red-500/60 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  GENERATED: 'border-nude bg-nude/35 text-[var(--text-primary)]',
  SENT: 'border-blue-brand-light/60 bg-blue-brand-soft/40 text-[var(--text-primary)]',
  CONFIRMED: 'border-green-sage/60 bg-green-sage/25 text-[var(--text-primary)]',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

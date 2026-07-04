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
  DRAFT: 'border-[#2c241c] bg-[#0e0d0c] text-[#d9d3ca]',
  CALCULATED: 'border-[#9c846a]/30 bg-[#9c846a]/12 text-[#e7dbc8]',
  APPROVED: 'border-[#b39671]/30 bg-[#b39671]/12 text-[#f0e1cf]',
  PAID: 'border-[#d7b488]/30 bg-[#d7b488]/12 text-[#f2dfc2]',
  PENDING: 'border-[#c5a785]/32 bg-[#c5a785]/12 text-[#efd8cf]',
  REJECTED: 'border-[#5d402f]/30 bg-[#5d402f]/12 text-[#e6d8cc]',
  LOST: 'border-[#2c241c]/34 bg-[#080706]/90 text-[#d9d3ca]',
  GENERATED: 'border-[#2c241c] bg-[#0e0d0c] text-[#d9d3ca]',
  SENT: 'border-[#9c846a]/30 bg-[#9c846a]/12 text-[#e7dbc8]',
  CONFIRMED: 'border-[#b39671]/30 bg-[#b39671]/12 text-[#f0e1cf]',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

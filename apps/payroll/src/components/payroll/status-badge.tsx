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
  DRAFT: 'border-[#2c241c] bg-[#0e0d0c] text-[#f1e7d8]',
  CALCULATED: 'border-[#9c846a]/30 bg-[#9c846a]/14 text-[#f4e6d0]',
  APPROVED: 'border-[#b39671]/30 bg-[#b39671]/14 text-[#f7e8d3]',
  PAID: 'border-[#d7b488]/30 bg-[#d7b488]/18 text-[#fff1dc]',
  PENDING: 'border-[#c5a785]/32 bg-[#c5a785]/14 text-[#ffe9e0]',
  REJECTED: 'border-[#5d402f]/30 bg-[#5d402f]/22 text-[#f4e3d6]',
  LOST: 'border-[#2c241c]/34 bg-[#080706]/90 text-[#f1e7d8]',
  GENERATED: 'border-[#2c241c] bg-[#0e0d0c] text-[#f1e7d8]',
  SENT: 'border-[#9c846a]/30 bg-[#9c846a]/14 text-[#f4e6d0]',
  CONFIRMED: 'border-[#b39671]/30 bg-[#b39671]/14 text-[#f7e8d3]',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

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
  DRAFT: 'border-stone-300 bg-stone-100 text-stone-700',
  CALCULATED: 'border-[#6e9aa7]/30 bg-[#6e9aa7]/15 text-[#315966]',
  APPROVED: 'border-[#6f8f78]/30 bg-[#6f8f78]/15 text-[#3d6848]',
  PAID: 'border-[#a87949]/30 bg-[#d2b48c]/25 text-[#7a4c25]',
  PENDING: 'border-[#d2b48c]/40 bg-[#d2b48c]/20 text-[#7a4c25]',
  REJECTED: 'border-[#b45f4d]/30 bg-[#b45f4d]/15 text-[#843b30]',
  LOST: 'border-[#342b25]/20 bg-[#342b25]/10 text-[#342b25]',
  GENERATED: 'border-stone-300 bg-stone-100 text-stone-700',
  SENT: 'border-[#6e9aa7]/30 bg-[#6e9aa7]/15 text-[#315966]',
  CONFIRMED: 'border-[#6f8f78]/30 bg-[#6f8f78]/15 text-[#3d6848]',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

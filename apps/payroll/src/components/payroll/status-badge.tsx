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
  DRAFT: 'border-[#4a4035] bg-[#15110e] text-[#d8c8b5]',
  CALCULATED: 'border-[#7fb3d5]/45 bg-[#102432] text-[#cbeeff]',
  APPROVED: 'border-[#91c7a3]/45 bg-[#122a1d] text-[#d7f7df]',
  PAID: 'border-[#a6d48e]/45 bg-[#172b13] text-[#e2ffd9]',
  PENDING: 'border-[#e8c36d]/45 bg-[#31220c] text-[#ffe7ad]',
  REJECTED: 'border-[#e0918c]/45 bg-[#341515] text-[#ffd5d1]',
  LOST: 'border-[#d36f6f]/45 bg-[#281112] text-[#ffc4c4]',
  GENERATED: 'border-[#b9a590]/45 bg-[#211a14] text-[#f3dfc8]',
  SENT: 'border-[#86bdd6]/45 bg-[#112733] text-[#d2f3ff]',
  CONFIRMED: 'border-[#95c9a8]/45 bg-[#122a1f] text-[#dcffe8]',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

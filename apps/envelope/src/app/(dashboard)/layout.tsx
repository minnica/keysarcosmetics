// Layout del área autenticada — incluye sidebar colapsable y provider del store
import { StoreProvider } from '@/lib/store'
import { LayoutShell } from '@/components/layout/LayoutShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <LayoutShell>{children}</LayoutShell>
    </StoreProvider>
  )
}

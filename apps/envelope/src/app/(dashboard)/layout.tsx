// Layout del área autenticada — incluye sidebar y provider del store
import { AppSidebar } from '@/components/layout/AppSidebar'
import { StoreProvider } from '@/lib/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </StoreProvider>
  )
}

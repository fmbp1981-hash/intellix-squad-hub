export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNav } from '@/components/ui/sidebar-nav'
import { Bell } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      <SidebarNav userEmail={user.email} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{
            background: 'hsl(240 27% 5% / 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid hsl(240 16% 14%)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: 'hsl(160 84% 39%)' }}
            />
            <span className="text-xs font-medium" style={{ color: 'hsl(160 84% 39%)' }}>
              Sistema operacional
            </span>
          </div>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

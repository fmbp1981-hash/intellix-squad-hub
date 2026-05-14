'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, LogOut, LayoutGrid,
  Briefcase, Target, Rocket, Home, ChevronRight, Sun,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'

const groups: {
  label: string
  items: { href: string; label: string; icon: React.ElementType }[]
}[] = [
  {
    label: 'Visão Geral',
    items: [{ href: '/workspaces', label: 'Painel', icon: Home }],
  },
  {
    label: 'IntelliX',
    items: [
      { href: '/office',   label: 'Escritório', icon: LayoutGrid },
      { href: '/pipeline', label: 'Pipeline',   icon: Target },
      { href: '/jobs',     label: 'Jobs',       icon: Briefcase },
    ],
  },
  {
    label: 'Squad Hub',
    items: [{ href: '/squads', label: 'Squads', icon: Building2 }],
  },
  {
    label: 'Projetos Ágeis',
    items: [{ href: '/projetos', label: 'Projetos', icon: Rocket }],
  },
]

function getInitials(email: string | null | undefined): string {
  if (!email) return '?'
  const [user] = email.split('@')
  return user.slice(0, 2).toUpperCase()
}

export function SidebarNav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="relative flex h-screen w-[230px] shrink-0 flex-col"
      style={{
        background: 'hsl(var(--sidebar-background))',
        borderRight: '1px solid hsl(var(--sidebar-border))',
      }}
    >
      {/* Ambient glow top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 120% 60% at 50% -10%, hsl(262 83% 58% / 0.25), transparent)',
        }}
      />

      {/* Logo */}
      <div
        className="relative flex items-center px-5 py-5"
        style={{ borderBottom: '1px solid hsl(240 16% 14%)' }}
      >
        <BrandLogo variant="full" />
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>

            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-brand-soft text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      style={{ background: 'var(--gradient-brand)' }}
                    />
                  )}

                  {/* Icon container */}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="flex-1 truncate">{label}</span>

                  {/* Arrow on hover (inactive) */}
                  {!isActive && (
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-40" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        className="relative px-3 pb-3 pt-3"
        style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}
      >
        {/* User info row */}
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          {/* Gradient avatar */}
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            {getInitials(userEmail)}
            {/* Online dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
              style={{
                background: 'hsl(160 84% 39%)',
                borderColor: 'hsl(var(--sidebar-background))',
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground" title={userEmail ?? ''}>
              {userEmail?.split('@')[0] ?? '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">IntelliX.AI · Admin</p>
          </div>
        </div>

        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Sun className="h-3.5 w-3.5" />
          Modo claro
        </button>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </aside>
  )
}

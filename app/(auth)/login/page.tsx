'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Layers, Rocket, ArrowRight } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Squads de IA',
    desc: 'Orquestre agentes especializados em consultoria.',
    color: 'hsl(262 83% 58%)',
  },
  {
    icon: Layers,
    title: 'Workspaces & Engagements',
    desc: 'Tudo num só cockpit, do lead à entrega.',
    color: 'hsl(189 94% 43%)',
  },
  {
    icon: Rocket,
    title: 'Projetos Ágeis',
    desc: 'Backlog, sprints e métricas em um só lugar.',
    color: 'hsl(38 92% 50%)',
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/workspaces')
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">

      {/* ══ Brand panel (left) ══ */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-12"
        style={{ background: 'hsl(240 27% 5%)' }}
      >
        {/* Gradient mesh */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 80% 60% at 20% 20%, hsl(262 83% 58% / 0.25), transparent 60%)',
              'radial-gradient(ellipse 60% 50% at 80% 80%, hsl(189 94% 43% / 0.18), transparent 60%)',
            ].join(', '),
          }}
        />

        {/* Grid lines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(hsl(240 16% 30% / 0.3) 1px, transparent 1px)',
              'linear-gradient(90deg, hsl(240 16% 30% / 0.3) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '48px 48px',
            opacity: 0.15,
          }}
        />

        {/* ── Logo top ── */}
        <div className="relative">
          <BrandLogo variant="full" />
        </div>

        {/* ── Main content bottom ── */}
        <div className="relative space-y-10">
          <div>
            {/* Badge */}
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: 'hsl(262 83% 58% / 0.3)',
                background: 'hsl(262 83% 58% / 0.1)',
                color: 'hsl(262 83% 75%)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: 'hsl(262 83% 65%)' }}
              />
              Acesso Interno IntelliX.AI
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl font-bold leading-tight text-white">
              IntelliX{' '}
              <span className="text-gradient-brand">Squad Hub</span>
            </h1>

            {/* Description */}
            <p
              className="mt-3 max-w-md text-sm leading-relaxed"
              style={{ color: 'hsl(215 20% 55%)' }}
            >
              Cockpit interno para orquestrar squads de agentes IA em
              engagements de consultoria empresarial.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <li key={title} className="flex gap-4">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `${color}20`,
                    border: `1px solid ${color}35`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'hsl(215 20% 55%)' }}>{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright */}
        <p className="relative text-xs" style={{ color: 'hsl(215 20% 40%)' }}>
          © 2025 IntelliX.AI · Consultoria Inteligente
        </p>
      </div>

      {/* ══ Form panel (right) ══ */}
      <div
        className="relative flex items-center justify-center overflow-hidden p-8"
        style={{ background: 'hsl(240 20% 7%)' }}
      >
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(hsl(240 16% 22% / 0.3) 1px, transparent 1px)',
              'linear-gradient(90deg, hsl(240 16% 22% / 0.3) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '32px 32px',
            opacity: 0.25,
          }}
        />

        {/* Ambient glow bottom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 110%, hsl(262 83% 58% / 0.1), transparent)',
          }}
        />

        <div className="relative w-full max-w-sm fade-in-up">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <BrandLogo variant="full" />
          </div>

          {/* Card */}
          <div
            className="relative rounded-2xl p-8"
            style={{
              background: 'hsl(240 17% 10%)',
              border: '1px solid hsl(240 16% 18%)',
              boxShadow: '0 25px 50px -12px hsl(240 27% 2% / 0.9)',
            }}
          >
            {/* Top accent gradient line */}
            <div
              className="absolute left-8 right-8 top-0 h-px rounded-full"
              style={{ background: 'var(--gradient-brand)', opacity: 0.6 }}
            />

            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Entrar
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'hsl(215 20% 55%)' }}>
              Acesse sua conta IntelliX.AI
            </p>

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color: 'hsl(215 20% 65%)' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="voce@intellixai.com.br"
                  required
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'hsl(240 16% 14%)',
                    border: '1px solid hsl(240 16% 22%)',
                    color: 'hsl(210 40% 92%)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'hsl(262 83% 58% / 0.6)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px hsl(262 83% 58% / 0.12)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'hsl(240 16% 22%)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color: 'hsl(215 20% 65%)' }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'hsl(240 16% 14%)',
                    border: '1px solid hsl(240 16% 22%)',
                    color: 'hsl(210 40% 92%)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'hsl(262 83% 58% / 0.6)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px hsl(262 83% 58% / 0.12)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'hsl(240 16% 22%)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <p
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{
                    background: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.25)',
                    color: 'hsl(0 84% 70%)',
                  }}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--gradient-brand)',
                  boxShadow: '0 4px 24px -4px hsl(262 83% 58% / 0.4)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar na plataforma
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

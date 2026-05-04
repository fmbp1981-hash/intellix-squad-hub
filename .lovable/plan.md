
# Prompt 1 — Scaffold inicial + Auth (revisado)

Fundação visual e de autenticação do **OpenSquad Platform**. Sem squads, sem Phaser, sem Edge Functions ainda — apenas a casca navegável com login funcional, branding IntelliX.AI aplicado e todas as rotas registradas como placeholders prontas para os próximos prompts.

## Regras globais do projeto (válidas para TODOS os prompts)

1. **Backend = Supabase externo da IntelliX.AI.** Lovable Cloud **não será ativado em hipótese alguma**. Toda menção a "Lovable Cloud" no `.md` original é ignorada e substituída por Supabase direto (cliente em `src/lib/supabase.ts` lendo `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`). Migrations, RLS, Edge Functions e Secrets são gerenciados no painel do Supabase da organização.
2. **Sequência de prompts.** Ao concluir cada prompt, eu **paro e peço explicitamente o próximo prompt da sequência** do `OPENSQUAD_PLATFORM_LOVABLE.md`:
   - Prompt 2 → Schema Supabase + Tipos
   - Prompt 3 → Workspaces (CRUD)
   - Prompt 4 → Squad Runs + Edge Function
   - Prompt 5 → Dashboard Escritório Virtual (Phaser)
   - Prompt 6 → Histórico de Runs + Output Viewer
   - Prompt 7 → Export PDF/DOCX + Google Drive
   - Prompt 8 → Polish Visual

## O que será entregue neste Prompt 1

### 1. Assets de marca
- Copiar `user-uploads://Logotipo.png` (fundo escuro) para `src/assets/intellix-logo.png` — usada na sidebar e tela de login.
- Copiar `user-uploads://Logotipo-removebg-preview.png` para `src/assets/intellix-logo-transparent.png` — versão transparente para usos compactos / favicon.
- Atualizar `index.html`: title `OpenSquad Platform — IntelliX.AI`, meta description e favicon.
- Referência viva: site oficial **www.intellixai.com.br** (paleta amarelo→azul preservada como inspiração; tokens da plataforma seguem violeta `#7c3aed` + cyan `#06b6d4` conforme PRD).

### 2. Design system (Tailwind + tokens)
- Importar **DM Sans** + **Inter** + **JetBrains Mono** via Google Fonts no `index.html`.
- Reescrever `src/index.css` com paleta dark IntelliX como tokens HSL semânticos:
  - `--background` `#0a0a0f`, `--card` `#13131a`, `--muted` `#1a1a24`, `--border` `#2a2a3a`
  - `--primary` `#7c3aed`, `--secondary` `#06b6d4`
  - `--foreground` `#f1f5f9`, `--muted-foreground` `#94a3b8`
  - `--success` `#10b981`, `--warning` `#f59e0b`, `--destructive` `#ef4444`
  - `--gradient-brand: linear-gradient(135deg, #7c3aed, #06b6d4)`
- Forçar dark mode permanente (classe `dark` aplicada na `<html>`, sem light theme).
- Estender `tailwind.config.ts`: `font-display` (DM Sans), `font-sans` (Inter), `font-mono` (JetBrains Mono), tokens `success` / `warning`.

### 3. Componente `BrandLogo`
- Usa o PNG IntelliX.AI importado de `src/assets/`.
- Variantes: `compact` (só logo) e `full` (logo + textos "OpenSquad Platform" / "IntelliX.AI · Consultoria Inteligente").

### 4. Autenticação — Supabase externo
- Instalar `@supabase/supabase-js`.
- `src/lib/supabase.ts`: cliente único lendo `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`persistSession: true`, `autoRefreshToken: true`).
- Aviso amigável quando as envs ainda não estão configuradas (em vez de quebrar a app).
- Hook `useAuth`: registra `onAuthStateChange` **antes** do `getSession()` inicial; expõe `user`, `session`, `loading`, `signOut`.
- `ProtectedRoute`: redireciona para `/login` quando não autenticado, mostra loader enquanto resolve.
- **Pausa para credenciais:** ao final eu peço `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para você colar nos Secrets do Lovable.

### 5. Tela `/login`
- Fundo `#0a0a0f`, card centralizado (`#13131a`, borda `#2a2a3a`, sombra sutil violeta).
- Logo IntelliX.AI no topo + subtítulo "OpenSquad Platform".
- Form (React Hook Form + Zod): email + senha.
- Botão "Entrar" com gradiente da marca, estado de loading.
- Toast Sonner em erro; redireciona para `/workspaces` em sucesso.
- `supabase.auth.signInWithPassword`.

### 6. Layout global protegido (`AppLayout`)
- Sidebar fixa de 220px (`#13131a`, borda direita `#2a2a3a`):
  - Topo: `BrandLogo` full.
  - Nav `NavLink` com estado ativo (faixa lateral violeta + bg `#1a1a24`):
    - 🏢 **Workspaces** → `/workspaces`
    - ⚙️ **Configurações** → `/settings`
  - Rodapé: avatar (iniciais do email em gradiente), email truncado, botão **Sair** → `signOut()` + `/login`.
- Área principal: `<Outlet />` com padding e fundo `#0a0a0f`.

### 7. Rotas (React Router v6) — placeholders para o roadmap
```text
/login                              → LoginPage (público)
/                                   → <Navigate to="/workspaces" />
[ProtectedRoute + AppLayout]
  /workspaces                       → placeholder "Workspaces" (Prompt 3)
  /workspaces/new                   → placeholder (Prompt 3)
  /workspaces/:id                   → placeholder (Prompt 3)
  /workspaces/:id/run/:squad        → placeholder (Prompt 5)
  /workspaces/:id/runs              → placeholder (Prompt 6)
  /workspaces/:id/runs/:runId       → placeholder (Prompt 6)
  /settings                         → placeholder (v2)
*                                   → NotFound restilizada dark
```

## Detalhes técnicos
- **Sem Lovable Cloud.** Nenhum import de cliente autogerado. Tudo via `src/lib/supabase.ts`.
- **Strict TS, zero `any`.** Tipos via `User` / `Session` do `@supabase/supabase-js`.
- **shadcn/ui:** Button, Input, Label, Card, Sidebar.
- Schema, tabelas, RLS, Edge Functions, Phaser e VPS ficam para os Prompts 2–8.

## Próximos passos após aprovação
1. Implementar tudo acima.
2. Pausa: peço **URL do projeto Supabase + anon key** para Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Validamos login → eu peço explicitamente o **Prompt 2** para você colar.

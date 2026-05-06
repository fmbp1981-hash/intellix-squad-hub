## 1. Escritório – tela preta

**Causa:** `Phaser.Scale.RESIZE` combinado com container que mede `clientWidth=0` em alguns layouts, e a `OfficeScene` é instanciada sem `data` em `init`, então quando `setAgents` chega antes de `create()` ele nunca renderiza. Além disso, o `useIsAdmin` faz a tela aguardar e quando libera o container ainda não está medido.

**Correções em `src/pages/office/OfficePage.tsx` e `src/game/office/OfficeScene.ts`:**
- Trocar `scale.mode` para `Phaser.Scale.FIT` com `width=1000, height=600` fixos (canvas sempre visível, sem depender do clientWidth).
- Garantir que a criação do Phaser ocorra **somente após** `isAdmin === true` (atualmente o `useEffect` roda independente do gate, mas o container só existe quando admin). Adicionar dependência `[isAdmin]`.
- No `OfficeScene.create()`: chamar `renderAgents()` mesmo com array vazio (já faz) e expor um flag `ready` para que `setAgents` chamado antes de `create` guarde os dados e re-renderize após o ready.
- Remover o uso de Realtime no canal `run_steps` quando o usuário não tem permissão (com a nova política de `realtime.messages` admin-only, admins continuam recebendo — ok). Adicionar `try/catch` defensivo.

## 2. Consolidar Configurações em um único menu

**Sidebar (`src/components/layout/AppSidebar.tsx`):** substituir os dois itens "WhatsApp" e "Modelos LLM" por um único item **"Configurações"** apontando para `/settings`.

**Nova página `src/pages/settings/SettingsPage.tsx`:** layout com `Tabs` (shadcn) contendo duas abas:
- **WhatsApp** → renderiza o conteúdo atual do `WhatsAppSettings`.
- **Modelos LLM** → renderiza o conteúdo atual do `ModelSettings` (refatorado, ver item 3).

**Roteamento (`src/App.tsx`):** rota `/settings` passa a renderizar `SettingsPage`. Manter `/settings/whatsapp` e `/settings/models` como redirects para `/settings?tab=whatsapp|models` por compatibilidade.

## 3. Seleção de LLM com dropdowns Provider → Modelo

**Refatorar `ModelSettings`** (`src/pages/settings/ModelSettings.tsx`):
- Substituir os `<Input>` de `model` e `fallback_model` por dois `<Select>` (shadcn) em cascata:
  1. **Provider**: dropdown com `google`, `openai`, `anthropic` (lista enxuta, expansível depois).
  2. **Modelo**: dropdown que mostra apenas modelos válidos do provider selecionado.
- Catálogo local em `src/lib/llm-catalog.ts`:
  ```ts
  export const LLM_CATALOG = {
    google: ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
    openai: ["openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano"],
  };
  ```
- O campo `provider` do registro continua sendo derivado do prefixo do model (`model.split('/')[0]`) e salvo na coluna `provider`.
- Repetir o par (Provider, Modelo) para o **fallback** com a mesma lógica, com opção "Nenhum".
- Manter `temperature` e `max_tokens` como inputs numéricos.

## 4. Corrigir warning React (refs em `Select`/`Badge` no `JobsPage`)

`Select` da Radix exige um filho que aceite `ref`. Garantir que `SelectTrigger` envolva qualquer wrapper customizado, e `Badge` precisa estar com `forwardRef` (já é exportado como função). Investigar e adicionar `React.forwardRef` em `Badge` se necessário, e remover qualquer wrapper sem ref no `JobsPage`. (Warning não-bloqueante, mas será corrigido.)

## Arquivos afetados

- `src/pages/office/OfficePage.tsx` (correção tela preta)
- `src/game/office/OfficeScene.ts` (defensive setAgents pré-create)
- `src/components/layout/AppSidebar.tsx` (1 menu Configurações)
- `src/App.tsx` (rota consolidada + redirects)
- `src/pages/settings/SettingsPage.tsx` (novo, com Tabs)
- `src/pages/settings/ModelSettings.tsx` (dropdowns provider/modelo)
- `src/lib/llm-catalog.ts` (novo)
- `src/components/ui/badge.tsx` (forwardRef se necessário)

Aprova para eu implementar?
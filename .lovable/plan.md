## Correções

**1. Migração SQL** — restaurar `EXECUTE` em `has_role` (causa de "permission denied for function has_role" em /jobs e /office):
```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, anon, service_role;
```
A função é `SECURITY DEFINER`, então RLS continua segura.

**2. `src/components/layout/AppSidebar.tsx`** — substituir item único "Configurações" por dois links:
- "WhatsApp" → `/settings/whatsapp` (ícone MessageSquare)
- "Modelos LLM" → `/settings/models` (ícone Cpu)

**3. `src/pages/jobs/JobsPage.tsx`** — alinhar payload ao enum aceito pela edge function:
- Trocar `kind: "daily_report"` por `kind: "daily-standup"`
- Atualizar label do botão para "Disparar daily-standup"

**4. `src/pages/office/OfficePage.tsx`** — fallback de largura para evitar canvas Phaser de 0px:
- `width: containerRef.current.clientWidth || 800`
(O `Phaser.Scale.RESIZE` continua ajustando depois.)

## Arquivos
- nova migração SQL (GRANT EXECUTE)
- `src/components/layout/AppSidebar.tsx`
- `src/pages/jobs/JobsPage.tsx`
- `src/pages/office/OfficePage.tsx`

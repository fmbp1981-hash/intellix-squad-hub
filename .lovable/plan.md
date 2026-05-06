## Estrutura de Integração com Resend

Vou preparar toda a estrutura de código para a integração com Resend. As credenciais (API key + conector) você adiciona depois — o código já estará pronto para funcionar assim que a `RESEND_API_KEY` estiver disponível.

### 1. Edge Function `send-email` (refatorar)
Arquivo: `supabase/functions/send-email/index.ts`

- Validação de payload com Zod (`to`, `subject`, `html`/`text`, `from?`, `replyTo?`, `tags?`).
- Headers CORS padronizados.
- Chamada via **gateway Lovable**: `https://connector-gateway.lovable.dev/resend/emails`
  - `Authorization: Bearer ${LOVABLE_API_KEY}`
  - `X-Connection-Api-Key: ${RESEND_API_KEY}`
- Fallback amigável quando `RESEND_API_KEY` não está configurada (retorna 503 com mensagem clara em vez de quebrar).
- Logging em `email_log` (status: `sent` | `failed` | `skipped_no_key`) com `provider_message_id`, `error`, `to`, `subject`.
- Remetente padrão: `Plataforma <onboarding@resend.dev>` (sandbox), sobrescrevível via parâmetro `from`.

### 2. Helper compartilhado
Arquivo: `supabase/functions/_shared/email.ts`

- Função `sendEmail({ to, subject, html, text?, from?, tags? })` reutilizável por outras edge functions (`crm-automation-runner`, `crm-event-handler`, futuros disparos).
- Centraliza chamada ao `send-email` para evitar duplicação.

### 3. Atualizar `crm-automation-runner`
- Substituir invocação direta da action `send_email` para usar o helper compartilhado.
- Garantir que o erro do envio não quebra o pipeline da automação (log + continue).

### 4. Refatorar `src/pages/settings/IntegrationsPage.tsx`
- **Cartão Resend** com:
  - Status visual (Conectado / Pendente) — detectado via teste de envio.
  - Instrução curta: "Conecte a Resend pelo painel de Conectores da Lovable" (link para docs/painel).
  - Botão **"Enviar e-mail de teste"** → chama `send-email` com payload mínimo para o e-mail do usuário logado.
  - Aviso: "Para produção, verifique seu domínio no painel da Resend".
- Remover o campo manual de API key (não é mais necessário com o conector).
- Manter intacta a seção de Outbound Webhooks.

### 5. Hook frontend `useSendEmail`
Arquivo: `src/hooks/useSendEmail.ts`

- Wrapper sobre `supabase.functions.invoke('send-email', ...)` com tipagem, toast de sucesso/erro e estado de loading. Pronto para uso em qualquer formulário/ação.

### 6. Tabela `email_log` (verificar)
- Já criada no Lote D. Confirmar colunas necessárias (`to`, `subject`, `status`, `provider_message_id`, `error`, `created_at`). Se faltar algo, migration mínima de ajuste.

---

### Arquivos que serão criados/editados
- ✏️ `supabase/functions/send-email/index.ts` (refatorado p/ gateway)
- 🆕 `supabase/functions/_shared/email.ts`
- ✏️ `supabase/functions/crm-automation-runner/index.ts` (usar helper)
- ✏️ `src/pages/settings/IntegrationsPage.tsx`
- 🆕 `src/hooks/useSendEmail.ts`

### Próximos passos depois da estrutura
Quando quiser ativar de fato:
1. Conectar Resend pelo painel de Conectores (1 clique).
2. Testar envio pelo botão na página de Integrações.
3. Verificar domínio próprio na Resend para sair do sandbox.

Confirma para eu implementar?
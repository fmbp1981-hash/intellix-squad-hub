## Configurar INTERNAL_SECRET

Valor fornecido: `intellix-internal-7f8a9c2e1b4d6f8a9c2e1b4d6f8a9c2e`

### Passos

1. **Adicionar secret runtime** (`add_secret`) com nome `INTERNAL_SECRET` e o valor acima — fica disponível para as edge functions via `Deno.env.get("INTERNAL_SECRET")`.

2. **Espelhar no Postgres** via migration SQL para que `pg_cron` e os triggers (`trigger_crm_event`) consigam assinar as chamadas HTTP:
   ```sql
   ALTER DATABASE postgres SET app.internal_secret = 'intellix-internal-7f8a9c2e1b4d6f8a9c2e1b4d6f8a9c2e';
   ALTER DATABASE postgres SET app.supabase_url = 'https://hynadwlwrscvjubryqlg.supabase.co';
   ```
   Observação: as instruções globais proíbem `ALTER DATABASE postgres` em migrations. Portanto vou pedir que você execute esse bloco manualmente no SQL Editor (vou te dar o link), OU usar `set_config(...)` em uma função — porém isso não persiste entre sessões. **A forma correta é você rodar manualmente** (1 vez só).

3. **Verificar** chamando `/office/gestao` → "Perguntar à Ágata" e checando os logs da função `gestao-trigger`.

### Resultado
- Edge functions autenticam chamadas internas comparando o header `Authorization: Bearer <INTERNAL_SECRET>`.
- Triggers de CRM e cron jobs passam a invocar com sucesso as funções `crm-event-handler` e `gestao-trigger`.

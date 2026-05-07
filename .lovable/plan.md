## Diagnóstico

Inspecionei os 10 PNGs base64 da tabela `sprite_assets` byte a byte (chunks PNG + CRC). Resultado:

| Sprite   | Status no banco                                           |
|----------|-----------------------------------------------------------|
| ana      | OK                                                        |
| beatriz  | OK                                                        |
| bruno    | OK                                                        |
| carlos   | OK                                                        |
| roberto  | OK                                                        |
| **agata**   | IHDR com CRC inválido — PNG corrompido                 |
| **marcio**  | IDAT com CRC inválido — PNG corrompido                 |
| **flora**   | IDAT truncado (faltam ~507 bytes do stream)            |
| **maya**    | IDAT truncado (faltam ~16 bytes do stream)             |
| **heitor**  | IDAT truncado (faltam ~39 bytes do stream)             |

Por isso o navegador dispara `img.onerror` e o log mostra `[sprites] failed to decode agata / maya / ...`. O código de carregamento e o fallback procedural já funcionam corretamente — os 5 que aparecem "sem visualização gráfica" são exatamente os que o `Image()` não consegue decodificar, então caem no fallback procedural (genérico) e não no pixel-art.

**Não é bug de código.** Os base64 desses 5 registros foram gravados truncados/corrompidos no `sprite_assets`.

## O que precisa acontecer

Os PNGs originais (96×144 por frame, 10 frames = 960×144) precisam ser regravados na tabela `sprite_assets` para os keys: `agata`, `marcio`, `flora`, `maya`, `heitor`. Como `sprite_assets` é read-only via RLS, isso exige uma migração (INSERT ... ON CONFLICT UPDATE) com o base64 íntegro.

## Plano

1. **Você fornece os 5 PNGs íntegros** (ou os base64 já codificados) — pode colar no chat ou subir os arquivos. Aceito qualquer um destes formatos:
   - 5 arquivos PNG (96px × 144px por frame, 10 frames lado a lado = 960×144)
   - 5 strings base64 puras (sem prefixo `data:image/png;base64,`)

2. **Eu regravo no banco** via migração SQL:
   ```sql
   UPDATE public.sprite_assets
   SET base64 = '<novo_base64>', width = 960, height = 144
   WHERE key = 'agata';
   -- idem para marcio, flora, maya, heitor
   ```
   (sem tocar em `agent_configs` — confirmado.)

3. **Melhoria opcional no loader** (`OfficeAssets.ts`): no `img.onerror`, além de logar, chamar imediatamente `createAgentTexture` para o agente faltante. Hoje isso já acontece via o passo final de fallback (`AGENTS.forEach`), então é só cosmético — pode ficar como está.

## Próximo passo

Me envie os 5 spritesheets corretos (ou peça para eu regenerá-los proceduralmente em pixel-art se você não tiver os originais — nesse caso eu gero PNGs 960×144 com a mesma estrutura dos que funcionam e gravo no banco).

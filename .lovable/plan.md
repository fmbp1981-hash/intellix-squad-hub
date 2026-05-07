## Objetivo

Substituir a geração atual de sprites (`OfficeAssets.ts`), que produz figuras genéricas de 8 frames, por personagens humanos reconhecíveis em pixel art 32×48, com 10 frames cada (4 direções × 2 passos + idle + working), seguindo a especificação do prompt.

## Escopo

Mudanças concentradas em **apenas 2 arquivos**, sem mexer no banco, sem mexer em layout/salas/cena/comportamento.

### 1. `src/components/office/OfficeAssets.ts` (REESCREVER)

- Substituir `AgentDef` por nova estrutura baseada em `CharacterPalette`:
  - `skinBase/Shadow/Highlight`, `hairBase/Highlight`, `hairStyle`, `shirtBase/Shadow/Detail?`, `pantsBase/Shadow`, `shoeBase`, `eyeColor`, flags `hasGlasses/glassesColor`, `hasBadge/badgeColor`, `hasEarring`.
- Manter `AgentDef` exportado com campos legados (`key`, `name`, `homeRoom`, `role`, `bodyColor`, `hairColor`, `shirtColor`, `female`) para compatibilidade com `AgentSprite.ts` / `BehaviorController.ts` / `IntelliXOfficeScene.ts`, mas adicionar `palette: CharacterPalette` e `badge: string` (rótulo curto: "COO", "Scrum Master", "Lead Analyst", etc.).
- Definir as 10 paletas exatas do prompt: Ágata, Carlos, Márcio, Flora, Maya, Heitor, Ana, Bruno, Beatriz, Roberto (homeRoom mantém o mapeamento atual: gestao/comercial/operacoes/financeiro/marketing/ti + delivery×4).
- `createAgentTexture(scene, agent)`:
  - 10 frames de 32×48 desenhados via `Graphics` em um `RenderTexture` 320×48.
  - Camadas por frame, na ordem do prompt: sombra → sapatos → pernas (com swing) → torso (com gola/detail) → braços (com swing) e mãos cor de pele → badge no peito → pescoço → cabeça oval com highlight → olhos (ocultos no norte, deslocados E/W) → boca sutil → cabelo via `drawHair` → óculos (não no norte) → brinco (S/E).
  - Animações: `_walk_south/east/north/west` (frames 0-1, 2-3, 4-5, 6-7 a 4 fps), `_idle` (frame 8), `_working` (8-9 a 2 fps).
- Função interna `drawHair(gfx, ox, base, highlight, style, dir)` implementando os 8 estilos: `bob`, `short_male`, `medium_male`, `buzz`, `long_female`, `ponytail`, `curly`, `medium_female` (geometria exata do prompt).
- Sem assets externos. Tudo procedural.

### 2. `src/components/office/AgentSprite.ts` (AJUSTE MÍNIMO)

- O label de nome existente vira um **container** com badge colorido (papel) acima e nome abaixo, conforme `createNameLabel` do prompt:
  - retângulo arredondado com `palette.badgeColor ?? shirtBase`, texto monoespaçado 8px branco com a string `agent.badge`;
  - nome 10px bold com stroke preto.
- Manter posicionamento (`y + 38` relativo ao sprite), `setDepth` e atualização em `applyPosition`.
- Atualizar `setState("working")` para usar `${key}_working` (já compatível com nova animação de 2 frames).
- Nenhuma outra mudança de comportamento; `BehaviorController`, `IntelliXOfficeScene` e `OfficePage` permanecem como estão.

## Mapeamento de badges

| Agente   | Badge label        |
|----------|--------------------|
| Ágata    | COO                |
| Carlos   | Comercial          |
| Márcio   | Scrum Master       |
| Flora    | Financeiro         |
| Maya     | Marketing          |
| Heitor   | TI                 |
| Ana      | Lead Analyst       |
| Bruno    | Developer          |
| Beatriz  | Strategist         |
| Roberto  | Reviewer           |

## Compatibilidade

- API pública (`AGENTS`, `createAgentTexture`, `AgentDef.key/name/homeRoom/role`) preservada — nenhum outro arquivo precisa mudar.
- Animações `${key}_walk_*`, `${key}_idle`, `${key}_working` continuam existindo com os mesmos nomes consumidos por `AgentSprite`.

## Não escopo

- Banco de dados / `agent_configs`: intocado.
- Layout de salas, móveis, comportamento de FSM, banner de squad run, câmera: intocados.
- Sem novos assets externos, sem mudanças em `OfficePage.tsx`.

Aprovar para reescrever `OfficeAssets.ts` e ajustar o label de `AgentSprite.ts`?

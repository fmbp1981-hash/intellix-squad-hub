## Plano: Reescrever o Escritório Virtual (Phaser)

⚠️ Tabela `agent_configs` **não será tocada** — o escritório lê só `id/name/role` para tooltip; nenhum INSERT/UPDATE/DELETE.

---

### 1. Novos arquivos em `src/components/office/`

| Arquivo | Função |
|---|---|
| `IsoUtils.ts` | `isoToScreen / screenToIso / isoDepth`, constantes `TILE_W=64 / TILE_H=32`, definição de `ROOMS` e `ROOM_WAYPOINTS` |
| `OfficeAssets.ts` | Lista dos 7 agentes + `createAgentTexture()` que pinta um spritesheet 32×48 × 8 frames com `RenderTexture` (corpo, cabeça, cabelo, pernas alternadas, sombra) e registra animações `walk_south/east/north/west`, `idle`, `working` |
| `RoomBuilder.ts` | Para cada uma das 10 salas: piso isométrico (tiles diamantes alternados em 2 tons da cor da sala), paredes norte+oeste com face frontal e topo (sensação de volume), label flutuante com emoji+nome em fundo arredondado da cor da sala |
| `FurnitureFactory.ts` | Helper `isoBox(top/right/left)` + funções `desk / chair / monitor / plant / bookshelf / filingCabinet / roundTable / whiteboard / kanbanBoard / sofa / serverRack / counter / coffeeMachine / fridge / barTable / sink / toilet`. Compõe os móveis por sala conforme tabela do prompt |
| `AgentSprite.ts` | Classe que envolve `Phaser.GameObjects.Sprite` + label + bubble; movimento tile→tile com `stepTowardTarget(delta)`, troca de animação por direção, `setState()` com bubbles (talking/done/checkpoint/working/coffee), `setInteractive` com `onClick` |
| `BehaviorController.ts` | Máquina de estados autônoma: idle → (working / goto copa·coffee / goto wc·bathroom / goto reuniao·meeting) com timers aleatórios. Suporta `setExternalState()` para sobrescrever via Realtime |
| `IntelliXOfficeScene.ts` | Cena Phaser principal: `create()` chama `buildBackground` (gradiente + grid sutil) → `RoomBuilder.buildAll` → `FurnitureFactory.buildAll` → cria texturas dos agentes → spawna 7 `AgentSprite` no waypoint da `homeRoom` → câmera centralizada em GESTÃO com bounds + zoom+pan (drag e wheel) → `update()` propaga delta para cada `BehaviorController` e ressincroniza depth |
| `IntelliXOfficeViewer.tsx` | Wrapper React: dynamic `import('phaser')` dentro de `useEffect`, monta `Phaser.Game` em container ref, passa `agentStates` via `scene.registry.set('agentStates', …)` (sem recriar a cena), expõe `onAgentClick` como callback registrada na scene |

### 2. Substituir páginas que usam o viewer antigo

- `src/pages/office/OfficePage.tsx`: trocar import `OfficeScene` (do `@/game/office/...`) pelo novo `IntelliXOfficeViewer`. Remover toggle 2D/3D (apenas o novo isométrico). Manter checagem de admin e a query de `agent_configs` apenas para listar agentes na sidebar de tooltip.

### 3. Detalhes técnicos importantes

- **Z-order:** `isoDepth = (tileX+tileY)*100 + tileZ*10` aplicado a todos os objetos; agentes recebem `+5` em cima do depth do tile.
- **Performance:** texturas geradas uma única vez no `create()` da cena (cacheadas via `rt.saveTexture`); 7 sprites + ~50 graphics estáticos = bem dentro de 60fps.
- **Realtime opcional:** se `agentStates` não for fornecido, todos rodam em comportamento autônomo (timers aleatórios). Quando `internal_jobs` muda, `OfficePage` faz subscribe via Supabase Realtime e atualiza `scene.registry.set('agentStates', …)`; `update()` da cena lê o registry e chama `behaviorController.setExternalState(...)` no agente correspondente (mapeamento `agent_key` → `homeRoom`).
- **Sem assets externos:** zero PNG, zero font extra (usa Inter via CSS já carregado e emojis nativos).
- **Dynamic import obrigatório:** Phaser nunca importado no topo do `.tsx`. Os arquivos `.ts` da cena podem importar Phaser no topo (eles só são carregados via `await import(...)` no wrapper).

### 4. Limpeza opcional

Manter os arquivos antigos (`src/game/office/OfficeScene.ts`, `OfficeViewer2D.tsx`) intactos por enquanto — não são usados após a substituição em `OfficePage.tsx`. Removê-los pode ser feito num lote separado.

### 5. Riscos

- **Phaser 4** (já no `package.json`): API de `RenderTexture.saveTexture` muda levemente; o código adiciona explicitamente os frames com `texture.add(i, ...)` para garantir spritesheet.
- Posições de waypoint podem causar agentes empilhados se múltiplos forem para a mesma sala — resolvido com jitter de ±0.3 tiles no `goTo`.

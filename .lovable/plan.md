# Plano — Escritório Virtual IntelliX v2.0 (Reescrita Completa)

## Objetivo

Substituir a cena Phaser atual (retângulos planos + círculos) por um escritório isométrico vivo (estilo Habbo / Tiny Office) com 10 personagens animados, 10 salas mobiliadas e comportamento autônomo + sincronizado com `internal_jobs` e `squad_runs` via Realtime.

## Restrições respeitadas

- Sem DELETE/UPDATE em `agent_configs`. Nenhuma migration tocará system prompts.
- Phaser via `dynamic import` dentro de `useEffect` (build Vite seguro).
- Sem assets externos: tudo via `Graphics` + `RenderTexture`.
- Comunicação React → Phaser via `scene.registry`, sem recriar a cena.

## Arquitetura de Arquivos

```text
src/components/office/
├── IsoUtils.ts                 (REESCREVER — TILE_W=64, TILE_H=32, TILE_Z=40, isoDepth)
├── OfficeAssets.ts             (REESCREVER — createAgentTexture com 8 frames 32×48)
├── RoomBuilder.ts              (REESCREVER — piso xadrez + paredes com 3 faces sombreadas + janelas)
├── FurnitureFactory.ts         (REESCREVER — móveis isométricos por sala via Graphics)
├── AgentSprite.ts              (REESCREVER — sprite animado + balão + sombra + moveToward)
├── BehaviorController.ts       (REESCREVER — FSM completa: idle/working/walking/coffee/wc/meeting/talking/checkpoint/done)
├── IntelliXOfficeScene.ts      (REESCREVER — pipeline create/update + câmera drag/zoom + sync)
├── IntelliXOfficeViewer.tsx    (AJUSTAR — registry sync, dynamic import, ref game)
└── officeLayout.ts             (ATUALIZAR — ROOMS, ROOM_WAYPOINTS, ROOM_LABELS, AGENTS[10])
```

`OfficeViewer2D.tsx` e `useOfficeChoreography.ts` ficam como estão (não usados pela nova cena). `OfficePage.tsx` recebe pequenos ajustes para passar `onDepartmentClick` e mapear `squad_runs` ativos além de `internal_jobs`.

## Layout (10 salas)

Conforme especificado no prompt — `ROOMS` com `gestao, reuniao, comercial, marketing, financeiro, operacoes, delivery, ti, copa, wc` (origens, larguras e cores exatas do prompt). DELIVERY substitui RH.

## 10 Agentes

- 6 internos fixos: Ágata (gestao), Carlos (comercial), Márcio (operacoes), Flora (financeiro), Maya (marketing), Heitor (ti).
- 4 polimórficos em DELIVERY: Ana, Bruno, Beatriz, Roberto.
- Cada um com `bodyColor / hairColor / shirtColor / female / role / badge` conforme tabela do prompt.

## Sistema visual

- **Piso**: tiles isométricos alternados (`#1A2332` / `#1E2938`).
- **Paredes**: face superior + face direita escurecida (×0.6) + linha de brilho da cor da sala.
- **Móveis**: mesa, cadeira, monitor, quadro, planta, cafeteira, frigobar, rack TI, mesa redonda na reunião, banner DELIVERY, etc. — desenhados com 3 faces (topo claro, lateral escura) para sensação 3D.
- **Sombra**: elipse sob cada agente, alpha 0.25.
- **Balões**: talking, done, checkpoint (com tween pulse), working, coffee — `setDepth(isoDepth + 10)`.
- **Background**: gradiente radial `#0D1B2A → #060D17` + grid isométrico 4% alpha.
- **Z-order universal**: `(tileX+tileY)*100 + tileZ*10` + offsets (piso 0, parede 50, móvel +1, agente +5, balão +10, label 9999).

## Animação dos agentes

- `RenderTexture` 256×48, 8 frames (S/E/N/W × 2 passos), gerado em `createAgentTexture`.
- Animações: `walk_{south|east|north|west}`, `idle`, `working` (oscila torso a 2fps).
- Movimento via `moveToward(target, delta)` com velocidade 60 px/s; troca animação pela direção dominante.

## Máquina de estados (BehaviorController)

Estados: `idle | working | walking | meeting | coffee | bathroom | talking | checkpoint | done`.

Loop autônomo (a partir do idle, a cada 15–45s):
- 60% → working
- 20% → coffee (vai à copa, máx 2 simultâneos)
- 10% → bathroom (vai ao WC, máx 1 simultâneo)
- 10% → meeting (vai à sala de reunião)

`goTo(roomKey, afterState)` calcula caminho via waypoints intermediários (corredores entre salas) e segue tile a tile.

## Cenas especiais (reagindo ao Realtime)

- **Diretiva Ágata**: ao detectar `gestao_directives.status='dispatched'` (subscrição realtime), agente alvo + Ágata convergem na REUNIÃO, balões 💬, depois retornam.
- **Job concluído** (`internal_jobs.status='completed'`): balão ✅ por 3s → caminhada até GESTÃO → 5s ao lado de Ágata → volta a HOME.
- **Squad ativado** (`squad_runs.status='running'`): Ana→Bruno→Beatriz→Roberto migram para REUNIÃO em sequência; cada step do `squad_run_steps` ativa working no próximo e done no anterior; ao final todos ✅ e voltam para DELIVERY. Márcio facilita.
- **Banner de projeto** flutuante em DELIVERY enquanto há `squad_run` rodando (pulse scale 1.00↔1.02).
- **Sprint Planning** (`sprint-facilitate-planning`): todos convergem na REUNIÃO, balões 💬 alternados, finalizam com 📋.
- **Márcio Scrum Master**: ciclo de 2 min entre OPERAÇÕES e DELIVERY quando job de monitoramento ativo.

Restrições de capacidade (copa ≤2, wc ≤1) implementadas via contador no `IntelliXOfficeScene`.

## Câmera & input

- Bounds (-200,-100, 1600×1000), zoom inicial 1.0, range 0.5–2.0.
- Drag (`pointerdown/move/up`) faz pan; `wheel` faz zoom com tween 150ms.
- Click em agente → callback React `onAgentClick(key)` (abre tooltip / JobLauncher).
- Double click em sala → câmera tween (`pan` + `zoomTo(1.5, 800)`) até waypoint.

## Integração Realtime → Phaser

`OfficePage.tsx`:
- Carrega `internal_jobs` (status pending/running/completed recentes) e `squad_runs` ativos.
- Subscreve `internal_jobs`, `squad_runs`, `squad_run_steps`, `gestao_directives`.
- Compõe `agentStates: Record<agentKey, { status, currentJob, lastActivity }>` + `squadRun: {id, name, color, currentStep}`.
- Passa por prop ao `IntelliXOfficeViewer`, que faz `scene.registry.set('agentStates', ...)` / `set('squadRun', ...)` sem recriar a cena.

`IntelliXOfficeScene.update()` lê o registry, dispara `applyExternalState` no `BehaviorController` correspondente (override do loop autônomo enquanto houver estado externo) e atualiza/oculta o banner DELIVERY.

## Painel React lateral

Atualizar painel em `OfficePage.tsx`:
- Lista os 10 agentes com badge de status (mantém STATUS_COLOR atual + novos: walking/coffee/meeting).
- Botão "Reset câmera".
- Card "Squad ativo" com progress dos 4 steps quando `squadRun` existir.
- Click no agente → `scene.registry.set('focusAgent', key)` que faz `cameras.main.pan` até ele.

## Performance

- `setDepth` em vez de `bringToTop`.
- Partículas de poeira limitadas a 5 por agente, somente em `walking`.
- `RenderTexture` reaproveitada por agente (uma textura, várias instâncias).
- `update` em delta-time, sem alocações no hot path.

Meta: 60 fps com 10 agentes em movimento.

## Checklist final (do prompt)

Todos os itens da seção "Checklist de Qualidade" serão verificados visualmente em runtime após implementação (incluindo polimórficos migrando, banner DELIVERY, Márcio circulando, capacidades de copa/wc).

## Banco de dados

Sem alterações. Nenhuma migration. `agent_configs` permanece intocada.

---

Aprovar para eu reescrever os 9 arquivos acima e ajustar `OfficePage.tsx`?

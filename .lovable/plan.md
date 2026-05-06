## Objetivo

Substituir a tela atual do `/office` (atualmente em branco / pontos genéricos) por um **escritório virtual da IntelliX.AI** no estilo planta baixa de departamentos (referência da imagem enviada), com um **toggle 2D ↔ 3D** e usando o design system da plataforma (violeta `#7c3aed` + ciano `#06b6d4`, fundo `#0a0a0f`, cards `#13131a`).

Não usaremos novas dependências — Phaser já está no projeto. O 3D será uma **projeção isométrica** desenhada no próprio Phaser (mesma cena, câmera com transform isométrico), o que mantém o bundle leve e funciona bem com os agentes em movimento.

---

## O que será construído

### 1. Layout do escritório (planta baixa IntelliX)
Grid de 15×11 células com salas departamentais e áreas comuns:

```
┌─────────────┬───────────┬─────────────┐
│  COMERCIAL  │ MARKETING │ FINANCEIRO  │
├──────┬──┬───┴──┬────────┴──┬──────────┤
│ COPA │WC│ REUNIÃO          │  (porta  │
│      │  │                  │   DRIVE) │
├──────┴──┴────┬─────┬───────┼──────────┤
│      RH      │ OPS │GESTÃO │    TI    │
└──────────────┴─────┴───────┴──────────┘
```

Cada sala terá:
- Bloco colorido com a cor do departamento (paleta IntelliX adaptada)
- Pílula de label no canto superior esquerdo
- Mesas (retângulos) distribuídas dentro da sala
- Borda sutil em violeta/ciano para reforçar o design system

### 2. Agentes
- Carregados de `agent_configs` (join com `squad_configs`) — já é feito hoje
- Cada agente é posicionado **na mesa do seu squad** (mapeamento squad → sala)
- Aparência: círculo com cor do papel + emoji/ícone do role + label com nome
- Pulso em ciano quando `run_steps` está `processing` (já implementado, manter)
- Tooltip ao passar o mouse com nome / role / squad

### 3. Toggle 2D ↔ 3D
- Botão no topo direito da tela (`<Tabs>` com ícones de mapa / cubo)
- **2D**: vista superior tradicional (a planta acima)
- **3D**: mesma cena projetada em **isométrica** (ângulo 30°), paredes "extrudadas" 24px, mesas com sombra — implementado com `Phaser.Display.Color` + `setRotation`/`setScale` em containers, sem dependências novas
- Trocar o modo recria a cena Phaser (estado dos agentes preservado em ref)

### 4. Visual / Design System
- Fundo do canvas `#0a0a0f`, grid sutil `#1a1a24`
- Header "INTELLIX.AI · HQ" em violeta com gradient brand
- Cores das salas mapeadas pra paleta da plataforma (verde/laranja/ciano/violeta/âmbar/rosa)
- Container do canvas com `border-border`, `rounded-xl`, `shadow-card`
- Loader com `Loader2` (já existente)

---

## Arquivos

**Editados**
- `src/pages/office/OfficePage.tsx` — adiciona toggle 2D/3D, monta cena conforme modo, header IntelliX
- `src/game/office/OfficeScene.ts` — reescrito: desenha salas/mesas/labels da planta, posiciona agentes por squad, suporta `mode: '2d' | 'iso'`

**Criados**
- `src/game/office/officeFloorplan.ts` — definição das salas (id, label, cor, rect, mesas) e mapeamento squad → sala. Reaproveita ideias do `src/components/office/officeLayout.ts` mas adaptado às cores IntelliX
- `src/game/office/isoProjection.ts` — helpers `toIso(x, y)` para o modo 3D

**Não alterados**
- `OfficeViewer2D.tsx` (legado usado em `RunDashboard`) — fica como está pra não quebrar a tela de run

---

## Detalhes técnicos

- Toggle controlado por `useState<'2d'|'iso'>('2d')`; `useEffect` destrói o `Phaser.Game` e recria com o novo modo (cena recebe `init({ mode })`)
- Posicionamento dos agentes:
  ```ts
  const room = SQUAD_ROOM[agent.squad] ?? 'gestao';
  const desk = deskPositions(room, agentsInRoom.length)[indexInRoom];
  ```
- Modo isométrico: cada `(col,row)` vira `(x = (col-row)*CELL*0.86, y = (col+row)*CELL*0.5)`, salas ganham um retângulo de "parede" deslocado em `-24px` no Y para dar profundidade
- Realtime de `run_steps` continua igual (canal Supabase já existe)

---

## Fora de escopo

- Sprites de personagens (estilo pixel-art da segunda imagem) — usaremos círculos+ícones para manter coerência com o resto do design system; podemos evoluir depois para sprites se quiser
- Editor de layout (drag-and-drop de salas)

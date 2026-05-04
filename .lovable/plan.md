## Cruzamento: imagem do escritório virtual ↔ squads e departamentos do projeto

Mapeei as salas que aparecem na imagem de referência ("Duma Soluções") com os squads reais já cadastrados em `src/types/index.ts` (`AVAILABLE_SQUADS`) e com o estado de execução (`SquadState`/`AgentState`). O resultado é a planta única que **2D (Phaser)** e **3D (R3F)** vão renderizar, mantendo coerência total com os dados do Supabase.

### Mapa salas ↔ squads do projeto

| Sala na imagem | Squad no projeto (`AVAILABLE_SQUADS`) | Cor / ícone | Função no escritório |
|---|---|---|---|
| COMERCIAL | `comercial` — Comercial | #10b981 / 📈 | Sala departamental (mesas dos agentes do squad) |
| MARKETING | `marketing` — Marketing | #f97316 / 📣 | Sala departamental |
| FINANCEIRO | `financeiro` — Financeiro | #06b6d4 / 💰 | Sala departamental |
| OPERAÇÕES | `operacoes` — Operações | #f59e0b / ⚙️ | Sala departamental |
| TI | `ti` — Tecnologia | #ec4899 / 💻 | Sala departamental |
| PESQUISA | (sem squad próprio) | — | Reaproveitada como **RH** (`rh` — Recursos Humanos, #7c3aed / 👥), já que faltava sala e o squad RH já existe |
| GESTÃO | Squad **ativo** no momento (orquestrador) | cor do squad ativo | Sala central do "líder" — recebe checkpoints |
| SALA DE REUNIÃO (centro) | — | neutro | Ponto de encontro dos agentes em `checkpoint` |
| COPA | — | neutro | Espaço dos agentes em `idle` (descanso visual) |
| BANHEIRO / WC | — | neutro | Apenas decorativo |
| PORTA / SAÍDA (Drive) | — | dourado | Destino dos agentes em `delivering` |

Nota: a sala "PESQUISA" da imagem foi remapeada para **RH** porque o projeto tem 6 squads e a referência tem 5 departamentos + pesquisa; assim cobrimos todos os 6 squads sem inventar squad novo.

### Cruzamento agentes ↔ salas

`AgentState` já traz `desk: { col, row }` vindo do backend. A planta vai ignorar `col/row` cru e usar uma função de posicionamento que:

1. Pega o `squad` atual de `SquadState.squad`.
2. Encontra a sala correspondente na tabela acima (`ROOM_BY_SQUAD[squadId]`).
3. Distribui os `agents[]` em mesas dentro daquela sala (até 4 mesas por sala, layout em grade 2×2 dentro do retângulo da sala).
4. Se houver mais de 4 agentes, cria mesas extras encostadas na parede.

Posições derivadas, não aleatórias — 2D e 3D ficam idênticos.

### Cruzamento eventos ↔ animações

Eventos vêm do diff de `SquadState` recebido via Realtime:

| Evento no `SquadState` | O que acontece no escritório |
|---|---|
| `agent.status = 'idle'` | Agente sentado na mesa da sala do seu squad, leve respiração |
| `agent.status = 'working'` | Sentado, monitor pulsando na cor do squad, ícone ⌨️ acima |
| `handoff.from → handoff.to` | Agente `from` levanta, caminha (A* na grade) até a mesa do `to` — pode atravessar corredores entre salas — entrega 📄, mostra balão com `handoff.message`, volta para a própria mesa |
| `agent.status = 'checkpoint'` | Todos os agentes ativos caminham até a **Sala de Reunião central**, formam círculo ao redor do agente da sala **GESTÃO**; ao sair de checkpoint, voltam às mesas |
| `agent.status = 'delivering'` | Caminha até a **porta/saída (Drive)** com 📁, sai da tela, retorna |
| `agent.status = 'done'` | Senta, monitor verde, ✅ flutuante |
| `SquadState.status = 'completed'` | Todos os agentes acenam (pequeno tween) e voltam para a COPA |

### Como isso vira código

Tudo isso vive em **`src/components/office/officeLayout.ts`** (fonte única de verdade), consumido tanto por `OfficeViewer2D.tsx` (Phaser) quanto por `OfficeViewer3D.tsx` (R3F):

```ts
export const ROOM_BY_SQUAD: Record<SquadId, RoomId> = {
  comercial:  'comercial',
  marketing:  'marketing',
  financeiro: 'financeiro',
  operacoes:  'operacoes',
  ti:         'ti',
  rh:         'pesquisa', // sala "PESQUISA" da referência reusada para RH
};

export const ROOMS: Room[] = [
  { id:'comercial',  label:'COMERCIAL',  color:'#10b981', rect:[1,1,5,4],  desks:4 },
  { id:'marketing',  label:'MARKETING',  color:'#f97316', rect:[6,1,9,4],  desks:4 },
  { id:'financeiro', label:'FINANCEIRO', color:'#06b6d4', rect:[10,1,14,4],desks:4 },
  { id:'pesquisa',   label:'RH',         color:'#7c3aed', rect:[1,7,4,10], desks:4 },
  { id:'operacoes',  label:'OPERAÇÕES',  color:'#f59e0b', rect:[5,7,8,10], desks:4 },
  { id:'gestao',     label:'GESTÃO',     color:'#e2e8f0', rect:[9,7,11,10],desks:2 },
  { id:'ti',         label:'TI',         color:'#ec4899', rect:[12,7,14,10],desks:3 },
  { id:'meeting',    label:'REUNIÃO',    color:'#1e293b', rect:[6,5,10,6], desks:0 },
  { id:'copa',       label:'COPA',       color:'#475569', rect:[1,5,3,6],  desks:0 },
  { id:'wc',         label:'WC',         color:'#334155', rect:[4,5,5,6],  desks:0 },
];
export const DRIVE_DOOR: Cell = { col: 14, row: 6 };
```

E **`useOfficeChoreography(squadState)`** transforma o `SquadState` em `agentPositions` interpolados + fila de eventos, alimentando os dois renderers.

### Ajustes complementares

- `RunDashboard.tsx`: troca `OfficeViewerPlaceholder` por `<OfficeViewer squadState={state} />`.
- `AVAILABLE_SQUADS` permanece como está — nenhuma alteração de tipos/Supabase é necessária.
- Toggle 2D/3D persistido em `localStorage` (já no plano anterior).

### Próximo passo após aprovação

Implemento `officeLayout.ts`, `useOfficeChoreography.ts`, `OfficeViewer2D.tsx`, `OfficeViewer3D.tsx` e o wrapper `OfficeViewer.tsx`, integrando no `RunDashboard`. Em seguida sigo para o **Prompt 6** (relatórios de runs).

## Lote B — Sprint Board (página principal)

### Edge function: `agile-story-move`
- Input: `{ storyId, toStatus, sprintId? }`
- Valida transição, checa WIP limit (in_progress / in_review) consultando `agile_projects.wip_limit_*`
- Seta timestamps automáticos: `started_at`, `completed_at`, `accepted_at`
- Recalcula `committed_points` e `completed_points` do sprint
- Retorna `{ ok, reason?, limit? }`

### Hook: `useSprintBoard(projectId)`
- Carrega projeto + sprint ativo + épicos + stories (do sprint ativo OU backlog/ready se não houver sprint)
- Realtime subscription em `user_stories` e `sprints`

### Componentes novos
- `StoryCard.tsx` — card visual com borda colorida do épico, MoSCoW, INVEST bar, blocked banner, pontos, tags, cycle time, badge "divida" se ≥13pts
- (Reusa `StoryDetailDialog` do Lote A)

### Página: `/projects/:id/board`
- Header: cliente · projeto · sprint ativo · goal · barra de progresso
- 5 colunas (Backlog · Ready · In Progress · In Review · Done) com `@hello-pangea/dnd`
- Header de coluna com contador e WIP limit visível (badge laranja se estourado)
- Drag entre colunas → invoke `agile-story-move`
- Toast de erro com `wip_limit` mostrando "Limite de WIP atingido"
- Click no card abre `StoryDetailDialog`
- Stories `accepted` aparecem em Done com ring verde
- Stories `sprint` (já comprometidas) aparecem em Ready

### Integração
- Substitui o Placeholder atual em `/projects/:id/board` pelo `SprintBoardPage`
- Lib `@hello-pangea/dnd` já adicionada via `bun add`

### Ainda fora deste lote (vão para C)
- Criar/iniciar/encerrar sprint (botões aparecem mas levam ao Lote C)
- Cerimônias (Planning, Review, Retro)
- Burndown, métricas, impedimentos

Confirma para implementar?

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const PLANNING_TOOL = {
  type: "function",
  function: {
    name: "produce_project_plan",
    description: "Produz plano completo de execução do projeto: épicos, user stories, tarefas, sprint inicial e delegações por departamento.",
    parameters: {
      type: "object",
      properties: {
        execution_plan_md: { type: "string", description: "Plano executivo em markdown: visão, objetivos, marcos, riscos, premissas, equipe envolvida." },
        epics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              business_value: { type: "string" },
              moscow: { type: "string", enum: ["must", "should", "could", "wont"] },
              color: { type: "string" },
            },
            required: ["title", "description", "moscow"],
            additionalProperties: false,
          },
        },
        stories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              epic_index: { type: "number" },
              persona: { type: "string" },
              action: { type: "string" },
              benefit: { type: "string" },
              acceptance_criteria: { type: "string" },
              story_points: { type: "number" },
              moscow: { type: "string", enum: ["must", "should", "could", "wont"] },
              assignee_department: { type: "string" },
            },
            required: ["epic_index", "persona", "action", "benefit", "acceptance_criteria", "story_points", "moscow"],
            additionalProperties: false,
          },
        },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              story_index: { type: "number" },
              title: { type: "string" },
              description: { type: "string" },
              estimated_hours: { type: "number" },
              assignee_department: { type: "string" },
            },
            required: ["story_index", "title"],
            additionalProperties: false,
          },
        },
        first_sprint: {
          type: "object",
          properties: {
            goal: { type: "string" },
            duration_days: { type: "number" },
            story_indexes: { type: "array", items: { type: "number" } },
          },
          required: ["goal", "story_indexes"],
          additionalProperties: false,
        },
        delegations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              department: { type: "string" },
              responsibility: { type: "string" },
              deliverables: { type: "array", items: { type: "string" } },
            },
            required: ["department", "responsibility"],
            additionalProperties: false,
          },
        },
      },
      required: ["execution_plan_md", "epics", "stories", "first_sprint", "delegations"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const { project_id, mode = "initial" } = await req.json();
    if (!project_id) return jsonResponse({ error: "project_id required" }, 400);

    const supa = adminClient();
    const { data: project, error: projErr } = await supa
      .from("agile_projects")
      .select("*")
      .eq("id", project_id)
      .single();
    if (projErr || !project) return jsonResponse({ error: "project not found" }, 404);

    if (project.auto_planning_status === "running") {
      return jsonResponse({ ok: false, reason: "already running" });
    }

    await supa.from("agile_projects").update({ auto_planning_status: "running", auto_planning_error: null }).eq("id", project_id);

    // Contexto do CRM
    let dealContext = "";
    let contractContext = "";
    if (project.deal_id) {
      const { data: deal } = await supa.from("deals").select("*").eq("id", project.deal_id).maybeSingle();
      if (deal) {
        dealContext = `\n\n## Deal\n- Cliente: ${deal.company_name}\n- Valor: ${deal.value}\n- Modelo: ${deal.pricing_model ?? "—"}\n- Fechamento: ${deal.expected_close ?? "—"}\n- Escopo:\n${deal.scope_summary}`;
      }
    }
    if (project.contract_id) {
      const { data: contract } = await supa.from("contracts").select("*").eq("id", project.contract_id).maybeSingle();
      if (contract) {
        contractContext = `\n\n## Contrato\n- Início: ${contract.start_date}\n- Fim: ${contract.end_date ?? "—"}\n- Valor total: ${contract.total_value}\n- Escopo definitivo:\n${contract.scope_md}`;
      }
    }

    const systemPrompt = `Você é o Agente de Operações da IntelliX. Sua missão é transformar um contrato/escopo em um plano ágil executável seguindo PMI Agile Practice Guide e Scrum.

Para o projeto fornecido você deve:
1. Produzir um plano executivo em markdown (visão, objetivos, marcos macro, riscos, premissas, equipe envolvida).
2. Quebrar o escopo em 3-7 ÉPICOS bem nomeados, com business_value e priorização MoSCoW.
3. Para cada épico, gerar 2-6 USER STORIES no formato "Como [persona], quero [ação], para [benefício]" com critérios de aceite, story_points (Fibonacci 1,2,3,5,8,13) e assignee_department (engenharia, design, dados, operacoes, marketing, etc).
4. Opcionalmente, criar TAREFAS técnicas atômicas (≤8h) por story.
5. Sugerir a 1ª SPRINT (goal claro + lista de story_indexes, ~10-30 pontos).
6. DELEGAR responsabilidades por departamento (operacoes, engenharia, design, dados, etc) com entregáveis claros.

Use sempre português. Seja específico ao escopo. Use os índices (epic_index/story_index) para amarrar relacionamentos.`;

    const userPrompt = `## Projeto: ${project.name}
Cliente: ${project.client_name ?? "—"}
Tipo: ${project.project_type}
Sprint: ${project.sprint_duration_days} dias
Modo: ${mode === "refinement" ? "REFINAMENTO (escopo evoluiu — proponha ajustes incrementais)" : "INICIAL"}

## Descrição
${project.description ?? "(sem descrição)"}${dealContext}${contractContext}`;

    const aiResp = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [PLANNING_TOOL],
        tool_choice: { type: "function", function: { name: "produce_project_plan" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      await supa.from("agile_projects").update({
        auto_planning_status: "failed",
        auto_planning_error: `AI Gateway ${aiResp.status}: ${errText.slice(0, 500)}`,
      }).eq("id", project_id);
      return jsonResponse({ error: "ai_gateway_error", status: aiResp.status, details: errText }, 502);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await supa.from("agile_projects").update({ auto_planning_status: "failed", auto_planning_error: "No tool_call returned" }).eq("id", project_id);
      return jsonResponse({ error: "no_tool_call" }, 502);
    }

    const plan = JSON.parse(toolCall.function.arguments);

    // Limpa planejamento anterior se for inicial (não refinamento)
    if (mode === "initial") {
      await supa.from("user_stories").delete().eq("project_id", project_id);
      await supa.from("epics").delete().eq("project_id", project_id);
    }

    // Insere épicos
    const epicIds: string[] = [];
    for (const epic of plan.epics ?? []) {
      const { data, error } = await supa.from("epics").insert({
        project_id,
        title: epic.title,
        description: epic.description,
        business_value: epic.business_value,
        moscow: epic.moscow,
        color: epic.color ?? "#7c3aed",
        status: "open",
      }).select("id").single();
      if (error) console.error("epic insert error", error);
      epicIds.push(data?.id ?? "");
    }

    // Insere stories
    const storyIds: string[] = [];
    for (const story of plan.stories ?? []) {
      const epicId = epicIds[story.epic_index] ?? null;
      const { data, error } = await supa.from("user_stories").insert({
        project_id,
        epic_id: epicId,
        persona: story.persona,
        action: story.action,
        benefit: story.benefit,
        acceptance_criteria: story.acceptance_criteria,
        story_points: story.story_points,
        moscow: story.moscow,
        assignee_department: story.assignee_department ?? null,
        status: "backlog",
      }).select("id").single();
      if (error) console.error("story insert error", error);
      storyIds.push(data?.id ?? "");
    }

    // Tarefas
    for (const task of plan.tasks ?? []) {
      const storyId = storyIds[task.story_index];
      if (!storyId) continue;
      await supa.from("tasks").insert({
        story_id: storyId,
        title: task.title,
        description: task.description ?? null,
        estimated_hours: task.estimated_hours ?? null,
        assignee: task.assignee_department ?? null,
        status: "todo",
      });
    }

    // Sprint inicial
    if (plan.first_sprint) {
      const startDate = new Date();
      const endDate = new Date(Date.now() + (plan.first_sprint.duration_days ?? project.sprint_duration_days) * 86400000);
      const { data: sprint } = await supa.from("sprints").insert({
        project_id,
        number: 1,
        name: "Sprint 1",
        goal: plan.first_sprint.goal,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        status: "planned",
      }).select("id").single();

      if (sprint) {
        const sprintStoryIds = (plan.first_sprint.story_indexes ?? [])
          .map((i: number) => storyIds[i])
          .filter(Boolean);
        if (sprintStoryIds.length) {
          await supa.from("user_stories").update({ sprint_id: sprint.id, status: "ready" }).in("id", sprintStoryIds);
        }
      }
    }

    // Delegações como diretivas
    for (const deleg of plan.delegations ?? []) {
      await supa.from("directives").insert({
        title: `[${project.name}] ${deleg.responsibility}`,
        body: `**Departamento:** ${deleg.department}\n\n**Responsabilidade:** ${deleg.responsibility}\n\n**Entregáveis:**\n${(deleg.deliverables ?? []).map((d: string) => `- ${d}`).join("\n")}`,
        department: deleg.department,
        active: true,
      });
    }

    await supa.from("agile_projects").update({
      auto_planning_status: "completed",
      auto_planning_completed_at: new Date().toISOString(),
      execution_plan_md: plan.execution_plan_md,
    }).eq("id", project_id);

    // Log
    await supa.from("pipeline_step_outputs").insert({
      step_number: 1,
      agent_key: "operacoes",
      agent_name: "Agente de Operações",
      output_markdown: plan.execution_plan_md,
      status: "completed",
      tokens_in: aiData.usage?.prompt_tokens ?? 0,
      tokens_out: aiData.usage?.completion_tokens ?? 0,
    });

    return jsonResponse({
      ok: true,
      epics: epicIds.length,
      stories: storyIds.length,
      sprint_created: !!plan.first_sprint,
      delegations: (plan.delegations ?? []).length,
    });
  } catch (e) {
    console.error("operations-detail-project error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

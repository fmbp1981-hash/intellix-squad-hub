// marketing-curation — Iris (Claude Haiku 4.5)
// Filtra e classifica os itens coletados pelo Lúcio
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callMarketingAgent, dispatchNext } from "../_shared/marketing-llm.ts";

const IRIS_SYSTEM = `Você é Iris, curadora de conteúdo da IntelliX.AI.
Analise os artigos e classifique cada um com JSON estruturado.
Critérios de inclusão: impacto real em PMEs brasileiras, linguagem acessível para CEO, potencial de engajamento.
Critérios de exclusão: papers acadêmicos, benchmarks de modelos de IA, crypto, duplicatas, publicados há mais de 14 dias.
Categorias: eficiencia_operacional | decisao_dados | atendimento | vendas | gestao_pessoas | outros
Potencial: salvamento | compartilhamento | comentario | viral
Formato sugerido: carrossel | estatico | reel | news_semanal
Retorne SOMENTE um array JSON com os aprovados, no formato:
[{"titulo_original":"...","url":"...","fonte":"...","relevancia_score":8,"categoria":"...","angulo_editorial":"...","potencial_engajamento":"...","formato_sugerido":"...","is_top_5_semana":false,"is_viral_candidate":false}]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const { batch_id } = await req.json().catch(() => ({}));
  if (!batch_id) return jsonResponse({ error: "batch_id required" }, 400);

  const supa = adminClient();
  const { data: rawItems } = await supa.from("trends_raw").select("*").eq("batch_id", batch_id);
  if (!rawItems?.length) return jsonResponse({ error: "no_items" }, 404);

  const itemsList = rawItems.map((r, i) => `${i + 1}. [${r.source}] "${r.title}" — ${r.url}\n   ${r.content_snippet ?? ""}`).join("\n");

  const result = await callMarketingAgent("iris", [
    { role: "system", content: IRIS_SYSTEM },
    { role: "user", content: `Curate estes ${rawItems.length} itens coletados:\n\n${itemsList}` },
  ]);

  let curated: any[] = [];
  try {
    const match = result.content.match(/\[[\s\S]*\]/);
    curated = match ? JSON.parse(match[0]) : [];
  } catch {
    return jsonResponse({ error: "parse_failed", raw: result.content.slice(0, 500) }, 500);
  }

  // Marca os top 5 por relevancia_score
  const sorted = [...curated].sort((a, b) => (b.relevancia_score ?? 0) - (a.relevancia_score ?? 0));
  const top5Keys = new Set(sorted.slice(0, 5).map((_, i) => i));

  const toInsert = curated.map((item, idx) => ({
    batch_id,
    titulo_original:       item.titulo_original,
    url:                   item.url,
    fonte:                 item.fonte,
    relevancia_score:      item.relevancia_score,
    categoria:             item.categoria,
    angulo_editorial:      item.angulo_editorial,
    potencial_engajamento: item.potencial_engajamento,
    formato_sugerido:      item.formato_sugerido,
    is_top_5_semana:       top5Keys.has(idx),
    is_viral_candidate:    item.is_viral_candidate ?? false,
  }));

  if (toInsert.length > 0) {
    const { error } = await supa.from("trends_curated").insert(toInsert);
    if (error) return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, batch_id, curated_count: toInsert.length });
});

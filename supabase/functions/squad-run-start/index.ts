// supabase/functions/squad-run-start/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { workspaceId, squadName, runId } = await req.json();

  // Valida inputs
  if (!workspaceId || !squadName || !runId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Busca workspace para obter o slug
  const { data: workspace, error } = await supabase
    .from('workspaces').select('slug, client_name').eq('id', workspaceId).single();

  if (error || !workspace) {
    return new Response(JSON.stringify({ error: 'Workspace not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Chama o VPS runner
  const vpsUrl = Deno.env.get('VPS_RUNNER_URL')!;
  const vpsSecret = Deno.env.get('VPS_RUNNER_SECRET')!;

  const vpsResponse = await fetch(`${vpsUrl}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${vpsSecret}`,
    },
    body: JSON.stringify({
      workspaceSlug: workspace.slug,
      squadName,
      runId,
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/squad-state-update`,
      callbackSecret: Deno.env.get('CALLBACK_SECRET')!,
    }),
  });

  if (!vpsResponse.ok) {
    // Marca run como failed
    await supabase.from('squad_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId);
    return new Response(JSON.stringify({ error: 'VPS runner unavailable' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true, runId }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

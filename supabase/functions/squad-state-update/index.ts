// Callback público chamado pelo VPS Runner. Sem JWT — autenticado via CALLBACK_SECRET.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface IncomingState {
  status?: string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expected = `Bearer ${Deno.env.get('CALLBACK_SECRET') ?? ''}`;
  if (req.headers.get('Authorization') !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: { runId?: string; state?: IncomingState; outputMarkdown?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { runId, state, outputMarkdown } = payload;
  if (!runId || !state) {
    return new Response(JSON.stringify({ error: 'Missing runId or state' }), { status: 400 });
  }

  const updates: Record<string, unknown> = { state_snapshot: state };

  if (state.status === 'completed') {
    updates.status = 'completed';
    updates.completed_at = new Date().toISOString();
    if (outputMarkdown) updates.output_markdown = outputMarkdown;
  } else if (state.status === 'failed') {
    updates.status = 'failed';
    updates.completed_at = new Date().toISOString();
  } else if (state.status === 'running') {
    updates.status = 'running';
  }

  const { error } = await supabase.from('squad_runs').update(updates).eq('id', runId);
  if (error) {
    console.error('Error updating squad_run:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Dispara export automático ao concluir (Edge Function export-run será criada no Prompt 7)
  if (state.status === 'completed') {
    const { data: run } = await supabase
      .from('squad_runs')
      .select('workspace_id, squad_name')
      .eq('id', runId)
      .single();

    if (run) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/export-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          runId,
          workspaceId: run.workspace_id,
          squadName: run.squad_name,
        }),
      }).catch((err) => console.warn('export-run not available yet:', err));
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

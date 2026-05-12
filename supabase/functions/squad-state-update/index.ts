// supabase/functions/squad-state-update/index.ts
// Recebe updates do VPS cada vez que state.json muda

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Valida callback secret
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = `Bearer ${Deno.env.get('CALLBACK_SECRET')}`;
  if (authHeader !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { runId, state, outputMarkdown } = await req.json();
  if (!runId || !state) {
    return new Response(JSON.stringify({ error: 'Missing runId or state' }), { status: 400 });
  }

  const updates: Record<string, unknown> = {
    state_snapshot: state,
  };

  if (state.status === 'completed') {
    updates.status = 'completed';
    updates.completed_at = new Date().toISOString();
    if (outputMarkdown) updates.output_markdown = outputMarkdown;
  } else if (state.status === 'failed') {
    updates.status = 'failed';
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('squad_runs')
    .update(updates).eq('id', runId);

  if (error) {
    console.error('Error updating squad_run:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Se completou, dispara export automático (fire-and-forget)
  if (state.status === 'completed') {
    const { data: run } = await supabase
      .from('squad_runs')
      .select('workspace_id, squad_name')
      .eq('id', runId).single();

    if (run) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/export-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ runId, workspaceId: run.workspace_id, squadName: run.squad_name }),
      }).catch(console.error);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

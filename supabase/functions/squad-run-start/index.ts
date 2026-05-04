import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let body: { workspaceId?: string; squadName?: string; runId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { workspaceId, squadName, runId } = body;
  if (!workspaceId || !squadName || !runId) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: workspaceId, squadName, runId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .select('slug, client_name')
    .eq('id', workspaceId)
    .single();

  if (wsErr || !workspace) {
    return new Response(JSON.stringify({ error: 'Workspace not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const vpsUrl = Deno.env.get('VPS_RUNNER_URL');
  const vpsSecret = Deno.env.get('VPS_RUNNER_SECRET');
  const callbackSecret = Deno.env.get('CALLBACK_SECRET');

  if (!vpsUrl || !vpsSecret || !callbackSecret) {
    return new Response(
      JSON.stringify({
        error:
          'Server misconfigured: missing VPS_RUNNER_URL, VPS_RUNNER_SECRET or CALLBACK_SECRET',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let vpsResponse: Response;
  try {
    vpsResponse = await fetch(`${vpsUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vpsSecret}`,
      },
      body: JSON.stringify({
        workspaceSlug: workspace.slug,
        clientName: workspace.client_name,
        squadName,
        runId,
        callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/squad-state-update`,
        callbackSecret,
      }),
    });
  } catch (err) {
    await supabase
      .from('squad_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId);
    return new Response(
      JSON.stringify({ error: 'Cannot reach VPS runner', detail: String(err) }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!vpsResponse.ok) {
    await supabase
      .from('squad_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId);
    return new Response(
      JSON.stringify({ error: 'VPS runner returned error', status: vpsResponse.status }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true, runId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

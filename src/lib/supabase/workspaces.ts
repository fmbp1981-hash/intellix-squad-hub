import { supabase } from '../supabase';
import type { Workspace, SquadRun, Template, RunStatus } from '../../types';

// ---------- Templates ----------
export async function getTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Template[];
}

// ---------- Workspaces ----------
export async function getWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Workspace;
}

export interface CreateWorkspacePayload {
  client_name: string;
  engagement_name: string;
  description?: string;
  template_id?: string;
  owner_id: string;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
  const slug = `${toSlug(payload.client_name)}-${Date.now()}`;
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ ...payload, slug })
    .select()
    .single();
  if (error) throw error;
  return data as Workspace;
}

export async function updateWorkspaceDrive(
  id: string,
  drive_folder_id: string,
  drive_folder_url: string,
): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .update({ drive_folder_id, drive_folder_url })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Squad Runs ----------
export interface RunsSummary {
  total: number;
  latestStatus: RunStatus | null;
}

export async function getRunsSummaryByWorkspaces(
  ids: string[],
): Promise<Map<string, RunsSummary>> {
  const result = new Map<string, RunsSummary>();
  if (ids.length === 0) return result;

  const { data, error } = await supabase
    .from('squad_runs')
    .select('workspace_id, status, created_at')
    .in('workspace_id', ids)
    .order('created_at', { ascending: false });
  if (error) throw error;

  for (const row of (data ?? []) as Array<{
    workspace_id: string;
    status: RunStatus;
    created_at: string;
  }>) {
    const current = result.get(row.workspace_id);
    if (!current) {
      result.set(row.workspace_id, { total: 1, latestStatus: row.status });
    } else {
      result.set(row.workspace_id, {
        total: current.total + 1,
        latestStatus: current.latestStatus,
      });
    }
  }
  return result;
}

export async function getSquadRuns(workspace_id: string): Promise<SquadRun[]> {
  const { data, error } = await supabase
    .from('squad_runs')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SquadRun[];
}

export async function getSquadRun(runId: string): Promise<SquadRun | null> {
  const { data, error } = await supabase
    .from('squad_runs')
    .select('*')
    .eq('id', runId)
    .single();
  if (error) return null;
  return data as SquadRun;
}

export interface CreateSquadRunPayload {
  workspace_id: string;
  squad_name: string;
  created_by: string;
}

export async function createSquadRun(payload: CreateSquadRunPayload): Promise<SquadRun> {
  const { data, error } = await supabase
    .from('squad_runs')
    .insert({
      ...payload,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as SquadRun;
}

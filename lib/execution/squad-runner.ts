import { spawn } from 'node:child_process'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

const WORKSPACES_DIR = process.env.OPENSQUAD_WORKSPACES_DIR ?? '/srv/opensquad-workspaces'
const CLAUDE_BIN = process.env.CLAUDE_CODE_BIN ?? 'claude'

export function getWorkspaceDir(slug: string) {
  return path.join(WORKSPACES_DIR, slug)
}

export async function ensureWorkspaceDir(slug: string) {
  const dir = getWorkspaceDir(slug)
  await mkdir(dir, { recursive: true })
  return dir
}

export function runSquad(workspaceDir: string, squadName: string): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve) => {
    const output: string[] = []

    const proc = spawn(CLAUDE_BIN, ['-p', `/opensquad run ${squadName}`], {
      cwd: workspaceDir,
      env: { ...process.env },
      shell: false,
    })

    proc.stdout.on('data', (d: Buffer) => output.push(d.toString()))
    proc.stderr.on('data', (d: Buffer) => output.push(d.toString()))

    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 1, output: output.join('') })
    })
  })
}

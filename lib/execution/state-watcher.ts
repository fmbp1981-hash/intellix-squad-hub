import chokidar from 'chokidar'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { SquadState } from '@/types/squad-state'

type StateCallback = (workspaceId: string, squadName: string, state: SquadState) => void
type CompleteCallback = (workspaceId: string, squadName: string, runId: string) => void

const watchers = new Map<string, ReturnType<typeof chokidar.watch>>()

export function watchSquadState(
  workspaceDir: string,
  workspaceId: string,
  squadName: string,
  onUpdate: StateCallback,
  onComplete: CompleteCallback
) {
  const stateFile = path.join(workspaceDir, 'squads', squadName, 'state.json')
  const watchKey = `${workspaceId}:${squadName}`

  watchers.get(watchKey)?.close()

  const watcher = chokidar.watch(stateFile, { awaitWriteFinish: { stabilityThreshold: 100 } })

  watcher.on('change', async () => {
    try {
      const raw = await readFile(stateFile, 'utf-8')
      const state: SquadState = JSON.parse(raw) as SquadState
      onUpdate(workspaceId, squadName, state)

      if (state.status === 'completed' || state.status === 'failed') {
        await watcher.close()
        watchers.delete(watchKey)
        onComplete(workspaceId, squadName, state.updatedAt.replace(/[^0-9]/g, '-').slice(0, 19))
      }
    } catch (e) {
      console.error('state-watcher: error reading state.json', e)
    }
  })

  watchers.set(watchKey, watcher)
}

export function stopWatcher(workspaceId: string, squadName: string) {
  const key = `${workspaceId}:${squadName}`
  watchers.get(key)?.close()
  watchers.delete(key)
}

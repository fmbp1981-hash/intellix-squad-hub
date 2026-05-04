import { useEffect, useRef } from 'react'
import { useSquadStore } from '@/store/useSquadStore'
import type { WsMessage } from '@/types/squad-state'

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000
const WS_FAIL_THRESHOLD = 3
const POLL_INTERVAL_MS = 3000

export function useSquadSocket(workspaceId: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const setConnected = useSquadStore(s => s.setConnected)
  const setSnapshot = useSquadStore(s => s.setSnapshot)
  const updateSquadState = useSquadStore(s => s.updateSquadState)
  const setSquadInactive = useSquadStore(s => s.setSquadInactive)

  useEffect(() => {
    let disposed = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let reconnectDelay = RECONNECT_BASE_MS
    let wsFailCount = 0

    function dispatch(msg: WsMessage) {
      if (disposed) return
      switch (msg.type) {
        case 'SNAPSHOT': setSnapshot(msg.squads, msg.activeStates); break
        case 'SQUAD_UPDATE': updateSquadState(msg.squad, msg.state); break
        case 'SQUAD_INACTIVE': setSquadInactive(msg.squad); break
      }
    }

    function stopPolling() {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    }

    function startPolling() {
      stopPolling()
      const poll = async () => {
        if (disposed) return
        try {
          const res = await fetch(`/api/squads/${workspaceId}/snapshot`, { cache: 'no-store' })
          if (!res.ok || disposed) return
          dispatch(await res.json() as WsMessage)
          setConnected(true)
        } catch {
          // network error — silently retry
        }
      }
      void poll()
      pollTimerRef.current = setInterval(() => { void poll() }, POLL_INTERVAL_MS)
    }

    function connect() {
      if (disposed) return
      if (reconnectTimer !== undefined) { clearTimeout(reconnectTimer); reconnectTimer = undefined }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/__squads_ws?workspace=${workspaceId}`)
      wsRef.current = ws
      ws.onopen = () => {
        if (disposed) { ws.close(); return }
        setConnected(true)
        reconnectDelay = RECONNECT_BASE_MS
        wsFailCount = 0
        stopPolling()
      }
      ws.onmessage = (e) => {
        if (disposed) return
        try { dispatch(JSON.parse(e.data as string) as WsMessage) } catch { /* ignore malformed */ }
      }
      ws.onclose = () => {
        if (disposed) return
        setConnected(false)
        wsFailCount++
        if (wsFailCount >= WS_FAIL_THRESHOLD) startPolling()
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
          connect()
        }, reconnectDelay)
      }
      ws.onerror = () => { /* handled by onclose */ }
    }

    connect()
    return () => {
      disposed = true
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
      stopPolling()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [workspaceId, setConnected, setSnapshot, updateSquadState, setSquadInactive])
}

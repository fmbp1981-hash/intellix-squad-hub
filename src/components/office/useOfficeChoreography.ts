import { useEffect, useRef, useState } from 'react';
import { AVAILABLE_SQUADS, type AgentState, type SquadState, type SquadId } from '@/types';
import {
  DRIVE_DOOR,
  ROOM_BY_SQUAD,
  deskPositions,
  meetingPositions,
  lerp,
  type Cell,
} from './officeLayout';

export interface AgentPose extends Cell {
  id: string;
  name: string;
  icon: string;
  status: AgentState['status'];
  /** 0..1, how much the agent is "moving" (used for bobbing) */
  motion: number;
  carrying?: 'document' | 'folder' | null;
  bubble?: string | null;
}

export interface ChoreographyState {
  poses: AgentPose[];
  squadColor: string | null;
  meeting: boolean;
  handoff: { from: string; to: string; message: string } | null;
}

/**
 * Computes each agent's target cell given the squad state, then smoothly
 * animates current positions toward those targets at ~60fps.
 */
export function useOfficeChoreography(
  squadState: SquadState | null,
): ChoreographyState {
  const [, setTick] = useState(0);
  const posesRef = useRef<Map<string, AgentPose>>(new Map());
  const targetsRef = useRef<Map<string, Cell>>(new Map());
  const rafRef = useRef<number | null>(null);

  // Recompute targets whenever squadState changes
  useEffect(() => {
    if (!squadState) return;
    const squadId = squadState.squad as SquadId;
    const homeRoom = ROOM_BY_SQUAD[squadId] ?? 'gestao';
    const agents = squadState.agents ?? [];
    const homeDesks = deskPositions(homeRoom, agents.length);

    const checkpointActive = agents.some((a) => a.status === 'checkpoint');
    const meetingPos = checkpointActive ? meetingPositions(agents.length) : [];

    const handoff = squadState.handoff ?? null;

    agents.forEach((a, i) => {
      let target: Cell;
      if (a.status === 'delivering') {
        target = DRIVE_DOOR;
      } else if (checkpointActive) {
        target = meetingPos[i];
      } else if (handoff && a.name === handoff.from) {
        // walk toward the receiver desk
        const toIdx = agents.findIndex((x) => x.name === handoff.to);
        target = toIdx >= 0 ? homeDesks[toIdx] : homeDesks[i];
      } else {
        target = homeDesks[i];
      }
      targetsRef.current.set(a.id, target);

      const existing = posesRef.current.get(a.id);
      const carrying: AgentPose['carrying'] =
        a.status === 'delivering'
          ? 'folder'
          : handoff && a.name === handoff.from
            ? 'document'
            : null;
      const bubble = handoff && a.name === handoff.from ? handoff.message : null;

      if (!existing) {
        posesRef.current.set(a.id, {
          id: a.id,
          name: a.name,
          icon: a.icon,
          status: a.status,
          col: target.col,
          row: target.row,
          motion: 0,
          carrying,
          bubble,
        });
      } else {
        existing.status = a.status;
        existing.icon = a.icon;
        existing.name = a.name;
        existing.carrying = carrying;
        existing.bubble = bubble;
      }
    });

    // Drop agents that vanished
    for (const id of Array.from(posesRef.current.keys())) {
      if (!agents.find((a) => a.id === id)) {
        posesRef.current.delete(id);
        targetsRef.current.delete(id);
      }
    }
  }, [squadState]);

  // RAF loop interpolating current toward target
  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = 2.5; // cells per second
      let dirty = false;
      posesRef.current.forEach((pose) => {
        const t = targetsRef.current.get(pose.id);
        if (!t) return;
        const dx = t.col - pose.col;
        const dy = t.row - pose.row;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) {
          pose.motion = lerp(pose.motion, 0, 0.2);
          return;
        }
        const step = Math.min(dist, speed * dt);
        pose.col += (dx / dist) * step;
        pose.row += (dy / dist) * step;
        pose.motion = Math.min(1, dist);
        dirty = true;
      });
      if (dirty) setTick((n) => (n + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // build snapshot for renderers
  const poses = Array.from(posesRef.current.values()).map((p) => ({ ...p }));
  const squadId = squadState?.squad as SquadId | undefined;
  const squadColor = squadId
    ? AVAILABLE_SQUADS.find((s) => s.id === squadId)?.color ?? null
    : null;

  return {
    poses,
    squadColor,
    meeting: !!squadState?.agents?.some((a) => a.status === 'checkpoint'),
    handoff: squadState?.handoff ?? null,
  };
}

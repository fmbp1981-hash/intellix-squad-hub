// OfficeViewer2D.tsx — React-pure 2D office grid (no Phaser dependency)
import type { SquadState } from '@/types';
import { ROOMS } from './officeLayout';

export interface AgentExternalState {
  agentKey: string;
  status?: string;
  currentJob?: string;
}

interface Props {
  squadState: SquadState | null;
  agentExternalStates?: AgentExternalState[];
}

// ── Agent → room mapping ───────────────────────────────────────────────────
const AGENT_HOME: Record<string, string> = {
  agata:   'gestao',
  carlos:  'comercial',
  marcio:  'operacoes',
  flora:   'financeiro',
  maya:    'marketing',
  heitor:  'ti',
  ana:     'delivery',
  bruno:   'delivery',
  beatriz: 'delivery',
  roberto: 'delivery',
};

// All known agents with display info derived from OfficeAssets AGENTS list
interface AgentMeta {
  key: string;
  name: string;
  initial: string;
  shirtColor: string;
}

const AGENT_META: AgentMeta[] = [
  { key: 'agata',   name: 'Ágata',   initial: 'Á', shirtColor: '#7c3aed' },
  { key: 'carlos',  name: 'Carlos',  initial: 'C', shirtColor: '#10b981' },
  { key: 'marcio',  name: 'Márcio',  initial: 'M', shirtColor: '#f59e0b' },
  { key: 'flora',   name: 'Flora',   initial: 'F', shirtColor: '#06b6d4' },
  { key: 'maya',    name: 'Maya',    initial: 'M', shirtColor: '#f97316' },
  { key: 'heitor',  name: 'Heitor',  initial: 'H', shirtColor: '#ec4899' },
  { key: 'ana',     name: 'Ana',     initial: 'A', shirtColor: '#5b21b6' },
  { key: 'bruno',   name: 'Bruno',   initial: 'B', shirtColor: '#2563eb' },
  { key: 'beatriz', name: 'Beatriz', initial: 'B', shirtColor: '#7c3aed' },
  { key: 'roberto', name: 'Roberto', initial: 'R', shirtColor: '#059669' },
];

// Delivery room definition (not in officeLayout ROOMS — rendered separately)
interface RoomDef {
  id: string;
  label: string;
  color: string;
  colStart: number;
  rowStart: number;
  colEnd: number;
  rowEnd: number;
}

// Combine rooms from officeLayout plus delivery (shown as a corridor at bottom)
const ALL_ROOMS: RoomDef[] = [
  ...ROOMS.map((r) => ({
    id: r.id,
    label: r.label,
    color: r.color,
    colStart: r.rect[0] + 1,   // CSS grid is 1-indexed
    rowStart: r.rect[1] + 1,
    colEnd:   r.rect[2] + 2,   // exclusive end
    rowEnd:   r.rect[3] + 2,
  })),
  // Delivery corridor at bottom (tiles row 11-14 in iso, mapped to row 12-15)
  {
    id: 'delivery',
    label: 'DELIVERY',
    color: '#5b21b6',
    colStart: 1,
    rowStart: 12,
    colEnd: 6,
    rowEnd: 16,
  },
];

// ── Status dot color ───────────────────────────────────────────────────────
function statusDotColor(status: string | undefined): string {
  switch (status) {
    case 'working':   return '#22c55e';
    case 'meeting':   return '#06b6d4';
    case 'walking':   return '#f59e0b';
    case 'done':      return '#10b981';
    case 'idle':
    default:          return '#64748b';
  }
}

// ── Agent avatar ──────────────────────────────────────────────────────────
interface AvatarProps {
  meta: AgentMeta;
  status?: string;
  currentJob?: string;
}

function AgentAvatar({ meta, status, currentJob }: AvatarProps) {
  const dot = statusDotColor(status);
  return (
    <div
      className="flex flex-col items-center gap-[2px]"
      title={currentJob ? `${meta.name}: ${currentJob}` : meta.name}
    >
      {/* Circle with initial */}
      <div
        className="relative flex items-center justify-center rounded-full text-white font-bold select-none"
        style={{
          width: 28,
          height: 28,
          background: meta.shirtColor,
          fontSize: 12,
          boxShadow: `0 0 0 2px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.5)`,
        }}
      >
        {meta.initial}
        {/* Status dot */}
        <span
          className="absolute bottom-0 right-0 rounded-full border border-[#0f172a]"
          style={{
            width: 8,
            height: 8,
            background: dot,
            transform: 'translate(2px, 2px)',
          }}
        />
      </div>
      {/* Name label */}
      <span
        className="text-center leading-tight"
        style={{ fontSize: 9, color: 'rgba(248,250,252,0.75)', maxWidth: 32, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {meta.name.split(' ')[0]}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function OfficeViewer2D({ agentExternalStates }: Props) {
  // Build a map of agentKey → external state for O(1) lookup
  const stateMap = new Map<string, AgentExternalState>();
  agentExternalStates?.forEach((s) => stateMap.set(s.agentKey, s));

  // Group agents by their home room
  const agentsByRoom = new Map<string, AgentMeta[]>();
  AGENT_META.forEach((meta) => {
    const roomId = AGENT_HOME[meta.key] ?? 'delivery';
    const list = agentsByRoom.get(roomId) ?? [];
    list.push(meta);
    agentsByRoom.set(roomId, list);
  });

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-white/10"
      style={{ background: '#020617', aspectRatio: '15 / 16' }}
    >
      {/* 15-col × 16-row grid (extra row for delivery at bottom) */}
      <div
        className="relative w-full h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)',
          gridTemplateRows: 'repeat(16, 1fr)',
          gap: 0,
        }}
      >
        {/* Background grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${100 / 15}% ${100 / 16}%`,
          }}
        />

        {/* Render all rooms */}
        {ALL_ROOMS.map((room) => {
          const agents = agentsByRoom.get(room.id) ?? [];
          return (
            <div
              key={room.id}
              className="relative flex flex-col overflow-hidden"
              style={{
                gridColumn: `${room.colStart} / ${room.colEnd}`,
                gridRow: `${room.rowStart} / ${room.rowEnd}`,
                border: `1px solid ${room.color}1a`,
                background: `${room.color}12`,
                borderRadius: 4,
                margin: 2,
              }}
            >
              {/* Room label */}
              <span
                className="absolute top-[4px] left-[4px] uppercase tracking-wider font-semibold leading-none z-10"
                style={{
                  fontSize: 8,
                  color: room.color,
                  opacity: 0.9,
                  letterSpacing: '0.06em',
                }}
              >
                {room.label}
              </span>

              {/* Desk rectangles (decorative) */}
              <div className="absolute inset-0 flex flex-wrap gap-[3px] p-[16px_4px_4px] pointer-events-none">
                {Array.from({ length: Math.min(agents.length || 1, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      width: 18,
                      height: 10,
                      background: 'rgba(30,41,59,0.7)',
                      border: '1px solid rgba(51,65,85,0.5)',
                    }}
                  />
                ))}
              </div>

              {/* Agent avatars */}
              {agents.length > 0 && (
                <div className="absolute bottom-[4px] left-0 right-0 flex flex-wrap justify-center gap-[3px] px-1">
                  {agents.map((meta) => {
                    const ext = stateMap.get(meta.key);
                    return (
                      <AgentAvatar
                        key={meta.key}
                        meta={meta}
                        status={ext?.status}
                        currentJob={ext?.currentJob}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Drive door indicator (right edge, row 6-7) */}
        <div
          className="absolute right-0 flex items-center justify-center"
          style={{
            top: `${(5 / 16) * 100}%`,
            height: `${(2 / 16) * 100}%`,
            width: 10,
            background: '#fbbf24',
            borderRadius: '2px 0 0 2px',
          }}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              fontSize: 7,
              color: '#78350f',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            DRIVE
          </span>
        </div>

        {/* Floor label */}
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ fontSize: 9, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.1em' }}
        >
          INTELLIX HQ
        </div>
      </div>
    </div>
  );
}

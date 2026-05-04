import type { SquadId } from '@/types';

export type RoomId =
  | 'comercial'
  | 'marketing'
  | 'financeiro'
  | 'pesquisa'
  | 'operacoes'
  | 'gestao'
  | 'ti'
  | 'meeting'
  | 'copa'
  | 'wc';

export interface Cell {
  col: number;
  row: number;
}

export interface Room {
  id: RoomId;
  label: string;
  color: string;
  /** [colStart, rowStart, colEnd, rowEnd] inclusive in grid units */
  rect: [number, number, number, number];
  desks: number;
  isDept?: boolean;
}

/** Grid is 15 cols x 11 rows. Each cell = CELL px in 2D / CELL units in 3D. */
export const GRID_COLS = 15;
export const GRID_ROWS = 11;
export const CELL_2D = 44;
export const CELL_3D = 1;

export const ROOMS: Room[] = [
  { id: 'comercial',  label: 'COMERCIAL',  color: '#10b981', rect: [1, 1, 5, 4],   desks: 4, isDept: true },
  { id: 'marketing',  label: 'MARKETING',  color: '#f97316', rect: [6, 1, 9, 4],   desks: 4, isDept: true },
  { id: 'financeiro', label: 'FINANCEIRO', color: '#06b6d4', rect: [10, 1, 14, 4], desks: 4, isDept: true },
  { id: 'pesquisa',   label: 'RH',         color: '#7c3aed', rect: [1, 7, 4, 10],  desks: 4, isDept: true },
  { id: 'operacoes',  label: 'OPERAÇÕES',  color: '#f59e0b', rect: [5, 7, 8, 10],  desks: 4, isDept: true },
  { id: 'gestao',     label: 'GESTÃO',     color: '#e2e8f0', rect: [9, 7, 11, 10], desks: 2, isDept: true },
  { id: 'ti',         label: 'TI',         color: '#ec4899', rect: [12, 7, 14, 10], desks: 3, isDept: true },
  { id: 'meeting',    label: 'REUNIÃO',    color: '#1e293b', rect: [6, 5, 10, 6],  desks: 0 },
  { id: 'copa',       label: 'COPA',       color: '#475569', rect: [1, 5, 3, 6],   desks: 0 },
  { id: 'wc',         label: 'WC',         color: '#334155', rect: [4, 5, 5, 6],   desks: 0 },
];

export const ROOM_BY_SQUAD: Record<SquadId, RoomId> = {
  comercial: 'comercial',
  marketing: 'marketing',
  financeiro: 'financeiro',
  operacoes: 'operacoes',
  ti: 'ti',
  rh: 'pesquisa',
};

export const DRIVE_DOOR: Cell = { col: 14, row: 6 };

export function getRoom(id: RoomId): Room {
  return ROOMS.find((r) => r.id === id)!;
}

/** Distribute up to N agents over a sub-grid of desks inside a room rect. */
export function deskPositions(roomId: RoomId, count: number): Cell[] {
  const room = getRoom(roomId);
  const [cs, rs, ce, re] = room.rect;
  const innerW = ce - cs - 1;
  const innerH = re - rs - 1;
  const cols = Math.max(1, Math.min(2, innerW));
  const rows = Math.ceil(count / cols);
  const positions: Cell[] = [];
  for (let i = 0; i < count; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    positions.push({
      col: cs + 1 + Math.round((c * Math.max(innerW - 1, 1)) / Math.max(cols - 1, 1)),
      row: rs + 1 + Math.round((r * Math.max(innerH - 1, 1)) / Math.max(rows - 1, 1)),
    });
  }
  return positions;
}

/** Agents sit forming a circle around the meeting room center. */
export function meetingPositions(count: number): Cell[] {
  const room = getRoom('meeting');
  const cx = (room.rect[0] + room.rect[2]) / 2;
  const cy = (room.rect[1] + room.rect[3]) / 2;
  const radius = 1.4;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      col: cx + Math.cos(angle) * radius,
      row: cy + Math.sin(angle) * radius,
    };
  });
}

export const STATUS_COLOR: Record<string, string> = {
  idle: '#64748b',
  working: '#06b6d4',
  done: '#10b981',
  checkpoint: '#f59e0b',
  delivering: '#a855f7',
};

/** Linear interpolation helper for choreography. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// IntelliX.AI HQ floor plan definition.
// Grid: 15 cols x 11 rows. CELL = 56px in 2D.

export const GRID_COLS = 15;
export const GRID_ROWS = 11;
export const CELL = 56;

export type RoomId =
  | "comercial"
  | "marketing"
  | "financeiro"
  | "rh"
  | "operacoes"
  | "gestao"
  | "ti"
  | "meeting"
  | "copa"
  | "wc";

export interface Room {
  id: RoomId;
  label: string;
  /** Hex color (IntelliX palette) */
  color: string;
  /** [colStart, rowStart, colEnd, rowEnd] inclusive */
  rect: [number, number, number, number];
  desks: number;
  isDept?: boolean;
}

// Palette aligned with IntelliX.AI design system
// (violet primary #7c3aed, cyan secondary #06b6d4, plus support hues)
export const ROOMS: Room[] = [
  { id: "comercial",  label: "COMERCIAL",  color: "#10b981", rect: [1, 1, 5, 4],   desks: 4, isDept: true },
  { id: "marketing",  label: "MARKETING",  color: "#f97316", rect: [6, 1, 9, 4],   desks: 4, isDept: true },
  { id: "financeiro", label: "FINANCEIRO", color: "#06b6d4", rect: [10, 1, 14, 4], desks: 4, isDept: true },
  { id: "copa",       label: "COPA",       color: "#475569", rect: [1, 5, 3, 6],   desks: 0 },
  { id: "wc",         label: "WC",         color: "#334155", rect: [4, 5, 5, 6],   desks: 0 },
  { id: "meeting",    label: "REUNIÃO",    color: "#7c3aed", rect: [6, 5, 10, 6],  desks: 0 },
  { id: "rh",         label: "RH",         color: "#a855f7", rect: [1, 7, 4, 10],  desks: 4, isDept: true },
  { id: "operacoes",  label: "OPERAÇÕES",  color: "#f59e0b", rect: [5, 7, 8, 10],  desks: 4, isDept: true },
  { id: "gestao",     label: "GESTÃO",     color: "#e2e8f0", rect: [9, 7, 11, 10], desks: 2, isDept: true },
  { id: "ti",         label: "TI",         color: "#ec4899", rect: [12, 7, 14, 10], desks: 3, isDept: true },
];

/** Loose mapping from a squad name (lowercased substring) to a room. */
export const SQUAD_ROOM: Record<string, RoomId> = {
  comercial: "comercial",
  vendas: "comercial",
  marketing: "marketing",
  financeiro: "financeiro",
  finance: "financeiro",
  rh: "rh",
  pessoas: "rh",
  operacoes: "operacoes",
  ops: "operacoes",
  gestao: "gestao",
  ti: "ti",
  tech: "ti",
};

export function roomForSquad(squad?: string | null): RoomId {
  if (!squad) return "gestao";
  const s = squad.toLowerCase();
  for (const key of Object.keys(SQUAD_ROOM)) {
    if (s.includes(key)) return SQUAD_ROOM[key];
  }
  return "gestao";
}

export function getRoom(id: RoomId): Room {
  return ROOMS.find((r) => r.id === id)!;
}

/** Distribute up to N agents across desks inside a room. Returns cell coords. */
export function deskPositions(roomId: RoomId, count: number): { col: number; row: number }[] {
  const room = getRoom(roomId);
  const [cs, rs, ce, re] = room.rect;
  const innerW = Math.max(1, ce - cs - 1);
  const innerH = Math.max(1, re - rs - 1);
  const cols = Math.max(1, Math.min(2, innerW));
  const rows = Math.max(1, Math.ceil(count / cols));
  const out: { col: number; row: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({
      col: cs + 1 + Math.round((c * Math.max(innerW - 1, 0)) / Math.max(cols - 1, 1)),
      row: rs + 1 + Math.round((r * Math.max(innerH - 1, 0)) / Math.max(rows - 1, 1)),
    });
  }
  return out;
}

export const ROLE_COLORS: Record<string, number> = {
  ceo: 0xf59e0b,
  manager: 0x7c3aed,
  analyst: 0x06b6d4,
  researcher: 0x10b981,
  writer: 0xec4899,
  reviewer: 0xef4444,
  default: 0x94a3b8,
};

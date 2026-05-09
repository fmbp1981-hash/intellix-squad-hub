// IsoUtils.ts — coordinate conversion + depth helpers for isometric 2:1 grid

export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_Z = 40;

export interface IsoPoint {
  tileX: number;
  tileY: number;
  tileZ?: number;
}

export function isoToScreen(tileX: number, tileY: number, tileZ = 0) {
  return {
    x: (tileX - tileY) * (TILE_W / 2),
    y: (tileX + tileY) * (TILE_H / 2) - tileZ * TILE_Z,
  };
}

export function screenToIso(screenX: number, screenY: number) {
  const tileX = (screenX / (TILE_W / 2) + screenY / (TILE_H / 2)) / 2;
  const tileY = (screenY / (TILE_H / 2) - screenX / (TILE_W / 2)) / 2;
  return { tileX, tileY };
}

export function isoDepth(tileX: number, tileY: number, tileZ = 0): number {
  return (tileX + tileY) * 100 + tileZ * 10;
}

export type RoomKey =
  | "copa" | "wc" | "comercial" | "delivery" | "reuniao"
  | "marketing" | "operacoes" | "gestao" | "financeiro" | "ti";

export interface RoomDef {
  x: number; y: number; w: number; h: number;
  label: string; color: number; emoji: string;
}

// Layout: 3 dept rows with 3-4 tile gaps + common areas (copa/wc) in central gap
export const ROOMS: Record<RoomKey, RoomDef> = {
  // Row 0 — top departments (separated by 3-tile gaps)
  comercial:  { x: 0,  y: 0,  w: 5, h: 4, label: "COMERCIAL",  color: 0x00897B, emoji: "📈" },
  marketing:  { x: 8,  y: 0,  w: 5, h: 4, label: "MARKETING",  color: 0xE64A19, emoji: "📣" },
  financeiro: { x: 16, y: 0,  w: 5, h: 4, label: "FINANCEIRO", color: 0x0891B2, emoji: "💰" },
  // Common areas — tucked in the central gap between rows 0 and 1
  copa:       { x: 6,  y: 5,  w: 3, h: 3, label: "COPA",       color: 0x6b7280, emoji: "☕" },
  wc:         { x: 5,  y: 9,  w: 2, h: 2, label: "WC",         color: 0x6366f1, emoji: "🚿" },
  // Row 1 — middle departments
  delivery:   { x: 0,  y: 8,  w: 5, h: 5, label: "DELIVERY",   color: 0x5b21b6, emoji: "🚀" },
  reuniao:    { x: 9,  y: 8,  w: 5, h: 4, label: "REUNIÃO",    color: 0x64748B, emoji: "🤝" },
  operacoes:  { x: 16, y: 8,  w: 5, h: 4, label: "OPERAÇÕES",  color: 0xF57F17, emoji: "⚙️" },
  // Row 2 — bottom departments
  gestao:     { x: 4,  y: 16, w: 4, h: 4, label: "GESTÃO",     color: 0x475569, emoji: "🎯" },
  ti:         { x: 11, y: 16, w: 4, h: 4, label: "TI",         color: 0xDB2777, emoji: "💻" },
};

export const ROOM_WAYPOINTS: Record<RoomKey, IsoPoint> = {
  comercial:  { tileX: 2,  tileY: 2  },
  marketing:  { tileX: 10, tileY: 2  },
  financeiro: { tileX: 18, tileY: 2  },
  copa:       { tileX: 7,  tileY: 6  },
  wc:         { tileX: 6,  tileY: 10 },
  delivery:   { tileX: 2,  tileY: 10 },
  reuniao:    { tileX: 11, tileY: 10 },
  operacoes:  { tileX: 18, tileY: 10 },
  gestao:     { tileX: 6,  tileY: 18 },
  ti:         { tileX: 13, tileY: 18 },
};

export const DELIVERY_SEATS: Record<string, IsoPoint> = {
  ana:     { tileX: 1, tileY: 9  },
  bruno:   { tileX: 3, tileY: 9  },
  beatriz: { tileX: 1, tileY: 11 },
  roberto: { tileX: 3, tileY: 11 },
};

export const MEETING_SEATS: Record<string, IsoPoint> = {
  ana:     { tileX: 10, tileY: 9  },
  bruno:   { tileX: 12, tileY: 9  },
  beatriz: { tileX: 10, tileY: 11 },
  roberto: { tileX: 12, tileY: 11 },
};

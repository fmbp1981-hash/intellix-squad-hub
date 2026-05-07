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

export const ROOMS: Record<RoomKey, RoomDef> = {
  copa:       { x: 0,  y: 0,  w: 3, h: 3, label: "COPA",       color: 0x6b7280, emoji: "☕" },
  wc:         { x: 3,  y: 0,  w: 2, h: 3, label: "WC",         color: 0x6366f1, emoji: "🚿" },
  comercial:  { x: 5,  y: 0,  w: 6, h: 4, label: "COMERCIAL",  color: 0x00897B, emoji: "📈" },
  delivery:   { x: 0,  y: 3,  w: 5, h: 4, label: "DELIVERY",   color: 0x5b21b6, emoji: "🚀" },
  reuniao:    { x: 5,  y: 3,  w: 4, h: 3, label: "REUNIÃO",    color: 0x64748B, emoji: "🤝" },
  marketing:  { x: 9,  y: 3,  w: 5, h: 4, label: "MARKETING",  color: 0xE64A19, emoji: "📣" },
  operacoes:  { x: 0,  y: 7,  w: 5, h: 4, label: "OPERAÇÕES",  color: 0xF57F17, emoji: "⚙️" },
  gestao:     { x: 5,  y: 7,  w: 4, h: 4, label: "GESTÃO",     color: 0x475569, emoji: "🎯" },
  financeiro: { x: 9,  y: 7,  w: 4, h: 4, label: "FINANCEIRO", color: 0x0891B2, emoji: "💰" },
  ti:         { x: 5,  y: 11, w: 4, h: 4, label: "TI",         color: 0xDB2777, emoji: "💻" },
};

export const ROOM_WAYPOINTS: Record<RoomKey, IsoPoint> = {
  copa:       { tileX: 1,  tileY: 1  },
  wc:         { tileX: 4,  tileY: 1  },
  comercial:  { tileX: 8,  tileY: 2  },
  delivery:   { tileX: 2,  tileY: 5  },
  reuniao:    { tileX: 7,  tileY: 4  },
  marketing:  { tileX: 11, tileY: 5  },
  operacoes:  { tileX: 2,  tileY: 9  },
  gestao:     { tileX: 7,  tileY: 8  },
  financeiro: { tileX: 11, tileY: 8  },
  ti:         { tileX: 7,  tileY: 12 },
};

// Per-agent seat positions inside delivery and meeting rooms (4 polymorphic agents)
export const DELIVERY_SEATS: Record<string, IsoPoint> = {
  ana:     { tileX: 1, tileY: 4 },
  bruno:   { tileX: 3, tileY: 4 },
  beatriz: { tileX: 1, tileY: 6 },
  roberto: { tileX: 3, tileY: 6 },
};

export const MEETING_SEATS: Record<string, IsoPoint> = {
  ana:     { tileX: 6, tileY: 4 },
  bruno:   { tileX: 8, tileY: 4 },
  beatriz: { tileX: 7, tileY: 3 },
  roberto: { tileX: 7, tileY: 5 },
};

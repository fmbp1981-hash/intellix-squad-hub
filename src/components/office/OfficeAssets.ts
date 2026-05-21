// OfficeAssets.ts — programmatic character sprites via Canvas 2D (Phaser 4 compatible)
import Phaser from "phaser";

export type HairStyle =
  | "bob" | "short_male" | "medium_male" | "buzz"
  | "long_female" | "ponytail" | "curly" | "medium_female";

export interface CharacterPalette {
  skinBase: number; skinShadow: number; skinHighlight: number;
  hairBase: number; hairHighlight: number; hairStyle: HairStyle;
  shirtBase: number; shirtShadow: number; shirtDetail?: number;
  pantsBase: number; pantsShadow: number;
  shoeBase: number;
  hasGlasses?: boolean; glassesColor?: number;
  hasBadge?: boolean; badgeColor?: number;
  hasEarring?: boolean;
  eyeColor: number;
}

export interface AgentDef {
  key: string;
  name: string;
  homeRoom: string;
  role: string;
  badge: string;
  bodyColor: number;
  hairColor: number;
  shirtColor: number;
  female: boolean;
  palette: CharacterPalette;
}

const mk = (
  key: string, name: string, homeRoom: string, role: string, badge: string,
  female: boolean, palette: CharacterPalette
): AgentDef => ({
  key, name, homeRoom, role, badge, female,
  bodyColor: palette.skinBase,
  hairColor: palette.hairBase,
  shirtColor: palette.shirtBase,
  palette,
});

export const AGENTS: AgentDef[] = [
  // ── Ágata — COO Digital ───────────────────────────────────────────────────
  mk("agata", "Ágata", "gestao", "manager", "COO", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0x1a1a2e, hairHighlight: 0x2d2d4e, hairStyle: "bob",
    shirtBase: 0x7c3aed, shirtShadow: 0x5b21b6, shirtDetail: 0x9f67ff,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0x1a1a1a,
    hasBadge: true, badgeColor: 0xfbbf24, eyeColor: 0x2d1b00,
  }),
  // ── Squad Comercial ───────────────────────────────────────────────────────
  mk("bia", "Bia", "comercial", "sdr", "SDR", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0x3d2b1f, hairHighlight: 0x5a4030, hairStyle: "bob",
    shirtBase: 0x00897B, shirtShadow: 0x00695C, shirtDetail: 0x4DB6AC,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x1a1a1a,
    hasBadge: true, badgeColor: 0x00897B, eyeColor: 0x2d1b00,
  }),
  mk("carlos", "Carlos", "comercial", "sales", "Comercial", false, {
    skinBase: 0xC68642, skinShadow: 0xA06B30, skinHighlight: 0xD89B56,
    hairBase: 0x1a1a2e, hairHighlight: 0x2a2a3e, hairStyle: "short_male",
    shirtBase: 0x10b981, shirtShadow: 0x059669, shirtDetail: 0xffffff,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x3b2507,
    eyeColor: 0x1a1a2e,
  }),
  // ── Squad Marketing ───────────────────────────────────────────────────────
  mk("maya", "Maya", "marketing", "strategist", "Estrategista", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0xff6b35, hairHighlight: 0xff8c5a, hairStyle: "curly",
    shirtBase: 0xf97316, shirtShadow: 0xea580c, shirtDetail: 0xfb923c,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0xf97316,
    hasBadge: true, badgeColor: 0xf97316, eyeColor: 0x1a6b00,
  }),
  mk("lucio", "Lúcio", "marketing", "researcher", "Pesquisa", false, {
    skinBase: 0xD4935A, skinShadow: 0xB07840, skinHighlight: 0xE8A86E,
    hairBase: 0x1a1a2e, hairHighlight: 0x2a2a3e, hairStyle: "medium_male",
    shirtBase: 0x3b82f6, shirtShadow: 0x2563eb, shirtDetail: 0x93c5fd,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x1e3a5f,
    hasGlasses: true, glassesColor: 0x1e3a5f, eyeColor: 0x1a1a2e,
  }),
  mk("iris", "Iris", "marketing", "curator", "Curadoria", true, {
    skinBase: 0xECB88A, skinShadow: 0xCC9870, skinHighlight: 0xFFCCA0,
    hairBase: 0x7c3aed, hairHighlight: 0x9f67ff, hairStyle: "long_female",
    shirtBase: 0xa855f7, shirtShadow: 0x7c3aed, shirtDetail: 0xd8b4fe,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0x7c3aed,
    hasEarring: true, eyeColor: 0x4c1d95,
  }),
  mk("otto", "Otto", "marketing", "analyst", "Dados", false, {
    skinBase: 0xF0D0A0, skinShadow: 0xD0B080, skinHighlight: 0xFFE4C0,
    hairBase: 0x292524, hairHighlight: 0x44403c, hairStyle: "buzz",
    shirtBase: 0x0891b2, shirtShadow: 0x0e7490, shirtDetail: 0x67e8f9,
    pantsBase: 0x292524, pantsShadow: 0x1c1917, shoeBase: 0x1e3a5f,
    hasGlasses: true, glassesColor: 0x0e7490, eyeColor: 0x164e63,
  }),
  mk("teo", "Téo", "marketing", "copywriter", "Copy", false, {
    skinBase: 0xC68642, skinShadow: 0xA06B30, skinHighlight: 0xD89B56,
    hairBase: 0x3d2b1f, hairHighlight: 0x5a4030, hairStyle: "short_male",
    shirtBase: 0xf59e0b, shirtShadow: 0xd97706, shirtDetail: 0xfcd34d,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x3b2507,
    eyeColor: 0x2d1b00,
  }),
  mk("vera", "Vera", "marketing", "art-director", "Arte", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0x831843, hairHighlight: 0xbe185d, hairStyle: "ponytail",
    shirtBase: 0xec4899, shirtShadow: 0xdb2777, shirtDetail: 0xf9a8d4,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0xbe185d,
    hasEarring: true, eyeColor: 0x831843,
  }),
  mk("sofia", "Sofia", "marketing", "reviewer", "Revisão", true, {
    skinBase: 0xECC99A, skinShadow: 0xCCAA7A, skinHighlight: 0xFFDDB0,
    hairBase: 0x2d1b00, hairHighlight: 0x4a3520, hairStyle: "medium_female",
    shirtBase: 0x059669, shirtShadow: 0x047857, shirtDetail: 0x6ee7b7,
    pantsBase: 0x1e293b, pantsShadow: 0x0f172a, shoeBase: 0x065f46,
    eyeColor: 0x14532d,
  }),
  // ── Squad Gestão TI ───────────────────────────────────────────────────────
  mk("heitor", "Heitor", "ti", "tech", "TI", false, {
    skinBase: 0xECC99A, skinShadow: 0xCCAA7A, skinHighlight: 0xFFDDB0,
    hairBase: 0x3d2b1f, hairHighlight: 0x5a4030, hairStyle: "buzz",
    shirtBase: 0xec4899, shirtShadow: 0xdb2777, shirtDetail: 0xf472b6,
    pantsBase: 0x1e293b, pantsShadow: 0x0f172a, shoeBase: 0x374151,
    hasGlasses: true, glassesColor: 0x374151, eyeColor: 0x1a3b6b,
  }),
];

const FRAME_W = 32;
const FRAME_H = 48;
const TOTAL_FRAMES = 10;

// ── Canvas 2D helpers ──────────────────────────────────────────────────────

function hexToRgba(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
  ctx.stroke();
}

export function drawHair(
  ctx: CanvasRenderingContext2D,
  ox: number,
  base: number,
  highlight: number,
  style: HairStyle,
): void {
  ctx.fillStyle = hexToRgba(base);
  switch (style) {
    case "bob":
      fillEllipse(ctx, ox + 16, 9, 16, 10);
      ctx.fillRect(ox + 8, 8, 16, 8);
      ctx.fillStyle = hexToRgba(highlight);
      fillEllipse(ctx, ox + 14, 7, 6, 4);
      break;
    case "short_male":
      fillEllipse(ctx, ox + 16, 8, 15, 8);
      ctx.fillStyle = hexToRgba(highlight);
      ctx.fillRect(ox + 12, 5, 6, 3);
      break;
    case "medium_male":
      fillEllipse(ctx, ox + 16, 8, 16, 9);
      ctx.fillRect(ox + 8, 6, 16, 5);
      ctx.fillStyle = hexToRgba(highlight);
      fillEllipse(ctx, ox + 18, 6, 5, 4);
      break;
    case "buzz":
      fillEllipse(ctx, ox + 16, 8, 14, 7);
      break;
    case "long_female":
      fillEllipse(ctx, ox + 16, 9, 16, 10);
      ctx.fillRect(ox + 7, 8, 4, 18);
      ctx.fillRect(ox + 21, 8, 4, 18);
      ctx.fillStyle = hexToRgba(highlight);
      fillEllipse(ctx, ox + 14, 7, 5, 3);
      break;
    case "ponytail":
      fillEllipse(ctx, ox + 16, 9, 15, 9);
      ctx.fillRect(ox + 19, 8, 5, 14);
      fillEllipse(ctx, ox + 21, 22, 4, 3);
      ctx.fillStyle = hexToRgba(highlight);
      fillEllipse(ctx, ox + 14, 7, 5, 3);
      break;
    case "curly":
      fillEllipse(ctx, ox + 16, 9, 18, 12);
      fillCircle(ctx, ox + 8, 10, 4);
      fillCircle(ctx, ox + 24, 10, 4);
      fillCircle(ctx, ox + 10, 15, 3);
      fillCircle(ctx, ox + 22, 15, 3);
      ctx.fillStyle = hexToRgba(highlight);
      fillCircle(ctx, ox + 14, 6, 3);
      fillCircle(ctx, ox + 20, 7, 2);
      break;
    case "medium_female":
      fillEllipse(ctx, ox + 16, 9, 16, 10);
      ctx.fillRect(ox + 7, 8, 4, 12);
      ctx.fillRect(ox + 21, 8, 4, 12);
      ctx.fillStyle = hexToRgba(highlight);
      fillEllipse(ctx, ox + 15, 7, 6, 3);
      break;
  }
}

export function drawFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  ox: number,
  p: CharacterPalette,
  dir: number,
  step: number,
  isWalk: boolean,
): void {
  const legOffsetL = isWalk && step === 0 ? -1 : 1;
  const legOffsetR = isWalk && step === 0 ? 1 : -1;
  const armSwingL = isWalk && step === 0 ? -1 : 1;
  const armSwingR = isWalk && step === 0 ? 1 : -1;

  // Shadow
  ctx.fillStyle = hexToRgba(0x000000, 0.22);
  fillEllipse(ctx, ox + 16, 46, 22, 6);

  // Shoes
  ctx.fillStyle = hexToRgba(p.shoeBase);
  fillRoundedRect(ctx, ox + 9 + legOffsetL, 42, 6, 4, 2);
  fillRoundedRect(ctx, ox + 17 + legOffsetR, 42, 6, 4, 2);

  // Legs
  ctx.fillStyle = hexToRgba(p.pantsBase);
  ctx.fillRect(ox + 10 + legOffsetL, 32, 5, 10);
  ctx.fillRect(ox + 17 + legOffsetR, 32, 5, 10);
  ctx.fillStyle = hexToRgba(p.pantsShadow);
  ctx.fillRect(ox + 10 + legOffsetL, 32, 2, 10);
  ctx.fillRect(ox + 17 + legOffsetR, 32, 2, 10);

  // Torso
  ctx.fillStyle = hexToRgba(p.shirtBase);
  fillRoundedRect(ctx, ox + 8, 19, 16, 13, 2);
  ctx.fillStyle = hexToRgba(p.shirtShadow);
  ctx.fillRect(ox + 8, 19, 3, 13);
  if (p.shirtDetail !== undefined) {
    ctx.fillStyle = hexToRgba(p.shirtDetail);
    ctx.fillRect(ox + 13, 19, 6, 2);
  }

  // Arms
  ctx.fillStyle = hexToRgba(p.shirtBase);
  ctx.fillRect(ox + 5, 20 + armSwingL, 4, 10);
  ctx.fillRect(ox + 23, 20 + armSwingR, 4, 10);
  // Hands
  ctx.fillStyle = hexToRgba(p.skinBase);
  ctx.fillRect(ox + 5, 28 + armSwingL, 4, 3);
  ctx.fillRect(ox + 23, 28 + armSwingR, 4, 3);

  // Badge
  if (p.hasBadge && p.badgeColor !== undefined) {
    ctx.fillStyle = hexToRgba(p.badgeColor);
    fillCircle(ctx, ox + 20, 22, 2);
  }

  // Neck
  ctx.fillStyle = hexToRgba(p.skinBase);
  ctx.fillRect(ox + 14, 17, 4, 3);

  // Head
  ctx.fillStyle = hexToRgba(p.skinBase);
  fillEllipse(ctx, ox + 16, 12, 14, 12);
  ctx.fillStyle = hexToRgba(p.skinHighlight);
  fillEllipse(ctx, ox + 14, 10, 4, 3);

  // Eyes (not when facing north)
  if (dir !== 2) {
    ctx.fillStyle = hexToRgba(0xffffff);
    ctx.fillRect(ox + 11, 11, 3, 3);
    ctx.fillRect(ox + 18, 11, 3, 3);
    ctx.fillStyle = hexToRgba(p.eyeColor);
    const eyeOffX = dir === 1 ? 1 : dir === 3 ? -1 : 0;
    ctx.fillRect(ox + 12 + eyeOffX, 12, 2, 2);
    ctx.fillRect(ox + 19 + eyeOffX, 12, 2, 2);
    // Mouth
    ctx.fillStyle = hexToRgba(p.skinShadow);
    ctx.fillRect(ox + 14, 15, 4, 1);
  }

  // Hair
  drawHair(ctx, ox, p.hairBase, p.hairHighlight, p.hairStyle);

  // Glasses
  if (p.hasGlasses && dir !== 2) {
    ctx.strokeStyle = hexToRgba(p.glassesColor ?? 0x1a1a2e);
    ctx.lineWidth = 1;
    strokeRoundedRect(ctx, ox + 10, 10, 4, 4, 1);
    strokeRoundedRect(ctx, ox + 17, 10, 4, 4, 1);
    ctx.beginPath();
    ctx.moveTo(ox + 14, 12);
    ctx.lineTo(ox + 17, 12);
    ctx.stroke();
  }

  // Earring
  if (p.hasEarring && (dir === 0 || dir === 1)) {
    ctx.fillStyle = hexToRgba(0xfbbf24);
    fillCircle(ctx, ox + 22, 14, 1.5);
  }
}

// ── DB-backed sprite loader ─────────────────────────────────────────────────

const DB_FRAME_W = 96;
const DB_FRAME_H = 144;
const DB_FRAMES = 10;

function registerAgentAnimations(scene: Phaser.Scene, key: string): void {
  const anim = (name: string, frames: number[], fr: number, repeat = -1) => {
    if (scene.anims.exists(name)) return;
    scene.anims.create({
      key: name,
      frames: frames.map((f) => ({ key, frame: f })),
      frameRate: fr,
      repeat,
    });
  };
  anim(`${key}_walk_south`, [0, 1], 4);
  anim(`${key}_walk_east`, [2, 3], 4);
  anim(`${key}_walk_north`, [4, 5], 4);
  anim(`${key}_walk_west`, [6, 7], 4);
  anim(`${key}_idle`, [8], 1, 0);
  anim(`${key}_working`, [8, 9], 2);
}

/**
 * Generate all agent sprites procedurally via Canvas 2D.
 * DB sprite loading is skipped — the sprite_assets table may contain stale data
 * that causes agents to render as solid black rectangles.
 */
export async function loadAgentSpritesFromDB(scene: Phaser.Scene): Promise<void> {
  AGENTS.forEach((a) => createAgentTexture(scene, a));
}

/**
 * Generate procedural character texture using Phaser 4's createCanvas API.
 * Uses scene.textures.createCanvas() which returns a CanvasTexture — fully
 * compatible with Phaser 4 (replaces the broken addSpriteSheet(canvas) approach).
 *
 * Renders a simple but visually rich circular avatar per frame:
 *   Frames 0-7: walk cycles (8 frames, 4 directions × 2 steps)
 *   Frame 8:    idle (pulse ring)
 *   Frame 9:    working (gear icon above circle)
 *
 * Canvas total: FRAME_W * TOTAL_FRAMES × FRAME_H = 320 × 48 px
 */
export function createAgentTexture(scene: Phaser.Scene, agent: AgentDef): void {
  if (scene.textures.exists(agent.key)) return;

  // Phaser 4: createCanvas returns a CanvasTexture (not addSpriteSheet from HTMLCanvasElement)
  const tex = scene.textures.createCanvas(
    agent.key,
    FRAME_W * TOTAL_FRAMES,
    FRAME_H,
  ) as Phaser.Textures.CanvasTexture | null;

  if (!tex) {
    console.warn("[sprites] createCanvas returned null for", agent.key);
    return;
  }

  const ctx = tex.getContext() as CanvasRenderingContext2D;

  // Draw full-body pixel-art character for each animation frame
  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const ox = frame * FRAME_W;
    if (frame < 8) {
      // Walk frames: 4 directions × 2 steps
      const dir = Math.floor(frame / 2); // 0=south 1=east 2=north 3=west
      const step = frame % 2;
      drawFrameToCanvas(ctx, ox, agent.palette, dir, step, true);
    } else {
      // Frame 8 = idle, Frame 9 = working — both use static south-facing pose
      drawFrameToCanvas(ctx, ox, agent.palette, 0, 0, false);
    }
  }

  // Flush canvas pixels to GPU texture
  tex.refresh();

  // Register frame regions (Phaser 4 CanvasTexture approach)
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  }

  registerAgentAnimations(scene, agent.key);
}

// OfficeAssets.ts — programmatic high-fidelity character sprites (32x48, 10 frames)
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
  // Legacy fields kept for compatibility with other modules
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
  mk("agata", "Ágata", "gestao", "manager", "COO", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0x1a1a2e, hairHighlight: 0x2d2d4e, hairStyle: "bob",
    shirtBase: 0x7c3aed, shirtShadow: 0x5b21b6, shirtDetail: 0x9f67ff,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0x1a1a1a,
    hasBadge: true, badgeColor: 0xfbbf24, eyeColor: 0x2d1b00,
  }),
  mk("carlos", "Carlos", "comercial", "sales", "Comercial", false, {
    skinBase: 0xC68642, skinShadow: 0xA06B30, skinHighlight: 0xD89B56,
    hairBase: 0x1a1a2e, hairHighlight: 0x2a2a3e, hairStyle: "short_male",
    shirtBase: 0x10b981, shirtShadow: 0x059669, shirtDetail: 0xffffff,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x3b2507,
    eyeColor: 0x1a1a2e,
  }),
  mk("marcio", "Márcio", "operacoes", "ops", "Scrum Master", false, {
    skinBase: 0xD4935A, skinShadow: 0xB07840, skinHighlight: 0xE8A86E,
    hairBase: 0x2d1b00, hairHighlight: 0x4a3520, hairStyle: "medium_male",
    shirtBase: 0xf59e0b, shirtShadow: 0xd97706, shirtDetail: 0xfcd34d,
    pantsBase: 0x292524, pantsShadow: 0x1c1917, shoeBase: 0x292524,
    hasGlasses: true, glassesColor: 0x1a1a2e, eyeColor: 0x2d1b00,
  }),
  mk("flora", "Flora", "financeiro", "finance", "Financeiro", true, {
    skinBase: 0xF0D0A0, skinShadow: 0xD0B080, skinHighlight: 0xFFE4C0,
    hairBase: 0x8B4513, hairHighlight: 0xA0612B, hairStyle: "ponytail",
    shirtBase: 0x06b6d4, shirtShadow: 0x0891b2, shirtDetail: 0x67e8f9,
    pantsBase: 0x1e293b, pantsShadow: 0x0f172a, shoeBase: 0x1a1a1a,
    hasEarring: true, eyeColor: 0x2d6b00,
  }),
  mk("maya", "Maya", "marketing", "marketing", "Marketing", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0xff6b35, hairHighlight: 0xff8c5a, hairStyle: "curly",
    shirtBase: 0xf97316, shirtShadow: 0xea580c, shirtDetail: 0xfb923c,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0xf97316,
    eyeColor: 0x1a6b00,
  }),
  mk("heitor", "Heitor", "ti", "tech", "TI", false, {
    skinBase: 0xECC99A, skinShadow: 0xCCAA7A, skinHighlight: 0xFFDDB0,
    hairBase: 0x3d2b1f, hairHighlight: 0x5a4030, hairStyle: "buzz",
    shirtBase: 0xec4899, shirtShadow: 0xdb2777, shirtDetail: 0xf472b6,
    pantsBase: 0x1e293b, pantsShadow: 0x0f172a, shoeBase: 0x374151,
    hasGlasses: true, glassesColor: 0x374151, eyeColor: 0x1a3b6b,
  }),
  mk("ana", "Ana", "delivery", "analyst", "Lead Analyst", true, {
    skinBase: 0xECB88A, skinShadow: 0xCC9870, skinHighlight: 0xFFCCA0,
    hairBase: 0x2d1b00, hairHighlight: 0x4a3520, hairStyle: "long_female",
    shirtBase: 0x5b21b6, shirtShadow: 0x4c1d95, shirtDetail: 0x7c3aed,
    pantsBase: 0x1e1e2e, pantsShadow: 0x141420, shoeBase: 0x1a1a1a,
    hasBadge: true, badgeColor: 0x14b8a6, eyeColor: 0x2d1b00,
  }),
  mk("bruno", "Bruno", "delivery", "developer", "Developer", false, {
    skinBase: 0xD4935A, skinShadow: 0xB07840, skinHighlight: 0xE8A86E,
    hairBase: 0x1a1a2e, hairHighlight: 0x2a2a3e, hairStyle: "medium_male",
    shirtBase: 0x2563eb, shirtShadow: 0x1d4ed8, shirtDetail: 0x3b82f6,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x1e3a5f,
    hasBadge: true, badgeColor: 0x3b82f6, eyeColor: 0x1a1a2e,
  }),
  mk("beatriz", "Beatriz", "delivery", "strategist", "Strategist", true, {
    skinBase: 0xF5C6A0, skinShadow: 0xD4A882, skinHighlight: 0xFFDBC2,
    hairBase: 0x8B4513, hairHighlight: 0xA0612B, hairStyle: "medium_female",
    shirtBase: 0x7c3aed, shirtShadow: 0x6d28d9, shirtDetail: 0x9f67ff,
    pantsBase: 0x292524, pantsShadow: 0x1c1917, shoeBase: 0x7c3aed,
    hasBadge: true, badgeColor: 0x7c3aed, eyeColor: 0x2d4b00,
  }),
  mk("roberto", "Roberto", "delivery", "reviewer", "Reviewer", false, {
    skinBase: 0xC68642, skinShadow: 0xA06B30, skinHighlight: 0xD89B56,
    hairBase: 0x3d2b1f, hairHighlight: 0x5a4030, hairStyle: "short_male",
    shirtBase: 0x059669, shirtShadow: 0x047857, shirtDetail: 0x10b981,
    pantsBase: 0x1f2937, pantsShadow: 0x111827, shoeBase: 0x1a1a1a,
    hasGlasses: true, glassesColor: 0x059669,
    hasBadge: true, badgeColor: 0x22c55e, eyeColor: 0x1a1a2e,
  }),
];

const FRAME_W = 32;
const FRAME_H = 48;
const TOTAL_FRAMES = 10;

function drawHair(
  gfx: Phaser.GameObjects.Graphics,
  ox: number,
  base: number,
  highlight: number,
  style: HairStyle,
  _dir: number
): void {
  gfx.fillStyle(base, 1);
  switch (style) {
    case "bob":
      gfx.fillEllipse(ox + 16, 9, 16, 10);
      gfx.fillRect(ox + 8, 8, 16, 8);
      gfx.fillStyle(highlight, 1);
      gfx.fillEllipse(ox + 14, 7, 6, 4);
      break;
    case "short_male":
      gfx.fillEllipse(ox + 16, 8, 15, 8);
      gfx.fillStyle(highlight, 1);
      gfx.fillRect(ox + 12, 5, 6, 3);
      break;
    case "medium_male":
      gfx.fillEllipse(ox + 16, 8, 16, 9);
      gfx.fillRect(ox + 8, 6, 16, 5);
      gfx.fillStyle(highlight, 1);
      gfx.fillEllipse(ox + 18, 6, 5, 4);
      break;
    case "buzz":
      gfx.fillEllipse(ox + 16, 8, 14, 7);
      break;
    case "long_female":
      gfx.fillEllipse(ox + 16, 9, 16, 10);
      gfx.fillRect(ox + 7, 8, 4, 18);
      gfx.fillRect(ox + 21, 8, 4, 18);
      gfx.fillStyle(highlight, 1);
      gfx.fillEllipse(ox + 14, 7, 5, 3);
      break;
    case "ponytail":
      gfx.fillEllipse(ox + 16, 9, 15, 9);
      gfx.fillRect(ox + 19, 8, 5, 14);
      gfx.fillEllipse(ox + 21, 22, 4, 3);
      gfx.fillStyle(highlight, 1);
      gfx.fillEllipse(ox + 14, 7, 5, 3);
      break;
    case "curly":
      gfx.fillEllipse(ox + 16, 9, 18, 12);
      gfx.fillCircle(ox + 8, 10, 4);
      gfx.fillCircle(ox + 24, 10, 4);
      gfx.fillCircle(ox + 10, 15, 3);
      gfx.fillCircle(ox + 22, 15, 3);
      gfx.fillStyle(highlight, 1);
      gfx.fillCircle(ox + 14, 6, 3);
      gfx.fillCircle(ox + 20, 7, 2);
      break;
    case "medium_female":
      gfx.fillEllipse(ox + 16, 9, 16, 10);
      gfx.fillRect(ox + 7, 8, 4, 12);
      gfx.fillRect(ox + 21, 8, 4, 12);
      gfx.fillStyle(highlight, 1);
      gfx.fillEllipse(ox + 15, 7, 6, 3);
      break;
  }
}

export function createAgentTexture(scene: Phaser.Scene, agent: AgentDef): void {
  if (scene.textures.exists(agent.key)) return;
  const p = agent.palette;

  const rt = scene.add
    .renderTexture(0, 0, FRAME_W * TOTAL_FRAMES, FRAME_H)
    .setVisible(false);

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const isWalk = frame < 8;
    const dir = isWalk ? Math.floor(frame / 2) : 0; // 0=S 1=E 2=N 3=W
    const step = frame % 2;
    const ox = frame * FRAME_W;

    const gfx = scene.add.graphics();

    // Shadow
    gfx.fillStyle(0x000000, 0.22);
    gfx.fillEllipse(ox + 16, 46, 22, 6);

    // Leg/arm swing offsets
    const legOffsetL = isWalk && step === 0 ? -1 : 1;
    const legOffsetR = isWalk && step === 0 ? 1 : -1;
    const armSwingL = isWalk && step === 0 ? -1 : 1;
    const armSwingR = isWalk && step === 0 ? 1 : -1;

    // Shoes
    gfx.fillStyle(p.shoeBase, 1);
    gfx.fillRoundedRect(ox + 9 + legOffsetL, 42, 6, 4, 2);
    gfx.fillRoundedRect(ox + 17 + legOffsetR, 42, 6, 4, 2);

    // Legs
    gfx.fillStyle(p.pantsBase, 1);
    gfx.fillRect(ox + 10 + legOffsetL, 32, 5, 10);
    gfx.fillRect(ox + 17 + legOffsetR, 32, 5, 10);
    gfx.fillStyle(p.pantsShadow, 1);
    gfx.fillRect(ox + 10 + legOffsetL, 32, 2, 10);
    gfx.fillRect(ox + 17 + legOffsetR, 32, 2, 10);

    // Torso
    gfx.fillStyle(p.shirtBase, 1);
    gfx.fillRoundedRect(ox + 8, 19, 16, 13, 2);
    gfx.fillStyle(p.shirtShadow, 1);
    gfx.fillRect(ox + 8, 19, 3, 13);
    if (p.shirtDetail !== undefined) {
      gfx.fillStyle(p.shirtDetail, 1);
      gfx.fillRect(ox + 13, 19, 6, 2);
    }

    // Arms
    gfx.fillStyle(p.shirtBase, 1);
    gfx.fillRect(ox + 5, 20 + armSwingL, 4, 10);
    gfx.fillRect(ox + 23, 20 + armSwingR, 4, 10);
    // Hands
    gfx.fillStyle(p.skinBase, 1);
    gfx.fillRect(ox + 5, 28 + armSwingL, 4, 3);
    gfx.fillRect(ox + 23, 28 + armSwingR, 4, 3);

    // Badge on chest
    if (p.hasBadge && p.badgeColor !== undefined) {
      gfx.fillStyle(p.badgeColor, 1);
      gfx.fillCircle(ox + 20, 22, 2);
    }

    // Neck
    gfx.fillStyle(p.skinBase, 1);
    gfx.fillRect(ox + 14, 17, 4, 3);

    // Head
    gfx.fillStyle(p.skinBase, 1);
    gfx.fillEllipse(ox + 16, 12, 14, 12);
    gfx.fillStyle(p.skinHighlight, 1);
    gfx.fillEllipse(ox + 14, 10, 4, 3);

    // Eyes (not when facing north)
    if (dir !== 2) {
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(ox + 11, 11, 3, 3);
      gfx.fillRect(ox + 18, 11, 3, 3);
      gfx.fillStyle(p.eyeColor, 1);
      const eyeOffX = dir === 1 ? 1 : dir === 3 ? -1 : 0;
      gfx.fillRect(ox + 12 + eyeOffX, 12, 2, 2);
      gfx.fillRect(ox + 19 + eyeOffX, 12, 2, 2);
      // Mouth
      gfx.fillStyle(p.skinShadow, 1);
      gfx.fillRect(ox + 14, 15, 4, 1);
    }

    // Hair
    drawHair(gfx, ox, p.hairBase, p.hairHighlight, p.hairStyle, dir);

    // Glasses
    if (p.hasGlasses && dir !== 2) {
      gfx.lineStyle(1, p.glassesColor ?? 0x1a1a2e, 1);
      gfx.strokeRect(ox + 10, 10, 4, 4);
      gfx.strokeRect(ox + 17, 10, 4, 4);
      gfx.lineBetween(ox + 14, 12, ox + 17, 12);
    }

    // Earring
    if (p.hasEarring && (dir === 0 || dir === 1)) {
      gfx.fillStyle(0xfbbf24, 1);
      gfx.fillCircle(ox + 22, 14, 1.5);
    }

    rt.draw(gfx, 0, 0);
    gfx.destroy();
  }

  rt.saveTexture(agent.key);
  const tex = scene.textures.get(agent.key);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  }
  // Don't destroy rt — it owns the GL texture used by sprites.

  const k = agent.key;
  const anim = (name: string, frames: number[], fr: number, repeat = -1) => {
    if (scene.anims.exists(name)) return;
    scene.anims.create({
      key: name,
      frames: frames.map((f) => ({ key: k, frame: f })),
      frameRate: fr,
      repeat,
    });
  };
  anim(`${k}_walk_south`, [0, 1], 4);
  anim(`${k}_walk_east`, [2, 3], 4);
  anim(`${k}_walk_north`, [4, 5], 4);
  anim(`${k}_walk_west`, [6, 7], 4);
  anim(`${k}_idle`, [8], 1, 0);
  anim(`${k}_working`, [8, 9], 2);
}

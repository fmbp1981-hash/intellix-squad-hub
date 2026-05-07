// OfficeAssets.ts — programmatic agent spritesheet generation
import Phaser from "phaser";

export interface AgentDef {
  key: string;
  name: string;
  bodyColor: number;
  hairColor: number;
  shirtColor: number;
  female: boolean;
  homeRoom: string;
  role: string;
}

export const AGENTS: AgentDef[] = [
  // 6 internos fixos
  { key: "agata",    name: "Ágata",   bodyColor: 0xF5C6A0, hairColor: 0x1a1a2e, shirtColor: 0x7c3aed, female: true,  homeRoom: "gestao",     role: "manager"    },
  { key: "carlos",   name: "Carlos",  bodyColor: 0xC68642, hairColor: 0x1a1a2e, shirtColor: 0x10b981, female: false, homeRoom: "comercial",  role: "sales"      },
  { key: "marcio",   name: "Márcio",  bodyColor: 0xD4935A, hairColor: 0x2d1b00, shirtColor: 0xf59e0b, female: false, homeRoom: "operacoes",  role: "ops"        },
  { key: "flora",    name: "Flora",   bodyColor: 0xF0D0A0, hairColor: 0x8B4513, shirtColor: 0x06b6d4, female: true,  homeRoom: "financeiro", role: "finance"    },
  { key: "maya",     name: "Maya",    bodyColor: 0xF5C6A0, hairColor: 0xff6b35, shirtColor: 0xf97316, female: true,  homeRoom: "marketing",  role: "marketing"  },
  { key: "heitor",   name: "Heitor",  bodyColor: 0xECC99A, hairColor: 0x3d2b1f, shirtColor: 0xec4899, female: false, homeRoom: "ti",         role: "tech"       },
  // 4 polimórficos delivery
  { key: "ana",      name: "Ana",     bodyColor: 0xECB88A, hairColor: 0x2d1b00, shirtColor: 0x5b21b6, female: true,  homeRoom: "delivery",   role: "analyst"    },
  { key: "bruno",    name: "Bruno",   bodyColor: 0xD4935A, hairColor: 0x1a1a2e, shirtColor: 0x2563eb, female: false, homeRoom: "delivery",   role: "developer"  },
  { key: "beatriz",  name: "Beatriz", bodyColor: 0xF5C6A0, hairColor: 0x8B4513, shirtColor: 0x7c3aed, female: true,  homeRoom: "delivery",   role: "strategist" },
  { key: "roberto",  name: "Roberto", bodyColor: 0xC68642, hairColor: 0x3d2b1f, shirtColor: 0x059669, female: false, homeRoom: "delivery",   role: "reviewer"   },
];

const FRAME_W = 32;
const FRAME_H = 48;
const FRAMES = 8;

export function createAgentTexture(scene: Phaser.Scene, agent: AgentDef): void {
  if (scene.textures.exists(agent.key)) return;

  const rt = scene.add.renderTexture(0, 0, FRAME_W * FRAMES, FRAME_H).setVisible(false);
  const gfx = scene.add.graphics();

  for (let frame = 0; frame < FRAMES; frame++) {
    const dir = Math.floor(frame / 2); // 0=S, 1=E, 2=N, 3=W
    const step = frame % 2;
    const fx = 0;
    const lift = step === 1 ? -1 : 0;

    gfx.clear();

    // Shadow
    gfx.fillStyle(0x000000, 0.28);
    gfx.fillEllipse(fx + 16, 46, 22, 5);

    // Legs (alternate length to simulate stride)
    gfx.fillStyle(0x1a1a2e, 1);
    if (step === 0) {
      gfx.fillRect(fx + 10, 34, 5, 12);
      gfx.fillRect(fx + 17, 34, 5, 10);
    } else {
      gfx.fillRect(fx + 10, 34, 5, 10);
      gfx.fillRect(fx + 17, 34, 5, 12);
    }

    // Torso
    gfx.fillStyle(agent.shirtColor, 1);
    gfx.fillRect(fx + 9, 20 + lift, 14, 16);
    gfx.fillStyle(0x000000, 0.18);
    gfx.fillRect(fx + 9, 20 + lift, 14, 2);

    // Arms swing
    gfx.fillStyle(agent.shirtColor, 1);
    const swing = step === 0 ? 1 : -1;
    gfx.fillRect(fx + 4,  22 + swing, 5, 10);
    gfx.fillRect(fx + 23, 22 - swing, 5, 10);
    gfx.fillStyle(agent.bodyColor, 1);
    gfx.fillCircle(fx + 6, 33 + swing, 2.5);
    gfx.fillCircle(fx + 25, 33 - swing, 2.5);

    // Head
    gfx.fillStyle(agent.bodyColor, 1);
    gfx.fillCircle(fx + 16, 13 + lift, 8);

    // Hair
    gfx.fillStyle(agent.hairColor, 1);
    if (agent.female) {
      gfx.fillRect(fx + 7, 6 + lift, 18, 9);
      gfx.fillCircle(fx + 16, 8 + lift, 8);
      gfx.fillRect(fx + 7, 13 + lift, 3, 9);
      gfx.fillRect(fx + 22, 13 + lift, 3, 9);
    } else {
      gfx.fillRect(fx + 8, 5 + lift, 16, 5);
      gfx.fillCircle(fx + 16, 7 + lift, 7);
    }

    // Face by direction
    if (dir === 0) {
      gfx.fillStyle(0x1a1a2e, 1);
      gfx.fillRect(fx + 12, 14 + lift, 1.5, 2);
      gfx.fillRect(fx + 18.5, 14 + lift, 1.5, 2);
    } else if (dir === 1) {
      gfx.fillStyle(0x1a1a2e, 1);
      gfx.fillRect(fx + 19, 14 + lift, 1.5, 2);
    } else if (dir === 3) {
      gfx.fillStyle(0x1a1a2e, 1);
      gfx.fillRect(fx + 11.5, 14 + lift, 1.5, 2);
    } else {
      // North = back of head, cover face with hair
      gfx.fillStyle(agent.hairColor, 1);
      gfx.fillCircle(fx + 16, 13 + lift, 8);
    }

    rt.draw(gfx, frame * FRAME_W, 0);
  }

  rt.saveTexture(agent.key);
  const tex = scene.textures.get(agent.key);
  for (let i = 0; i < FRAMES; i++) {
    tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  }

  gfx.destroy();
  rt.destroy();

  const k = agent.key;
  const mk = (name: string, a: number, b: number, fr = 6) => {
    if (scene.anims.exists(name)) return;
    scene.anims.create({
      key: name,
      frames: [{ key: k, frame: a }, { key: k, frame: b }],
      frameRate: fr,
      repeat: -1,
    });
  };
  mk(`${k}_walk_south`, 0, 1, 6);
  mk(`${k}_walk_east`,  2, 3, 6);
  mk(`${k}_walk_north`, 4, 5, 6);
  mk(`${k}_walk_west`,  6, 7, 6);
  if (!scene.anims.exists(`${k}_idle`)) {
    scene.anims.create({ key: `${k}_idle`, frames: [{ key: k, frame: 0 }], frameRate: 1 });
  }
  if (!scene.anims.exists(`${k}_working`)) {
    scene.anims.create({
      key: `${k}_working`,
      frames: [{ key: k, frame: 2 }, { key: k, frame: 3 }],
      frameRate: 3,
      repeat: -1,
    });
  }
}

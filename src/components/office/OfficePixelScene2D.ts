// OfficePixelScene2D.ts — pixel art office, opensquad assets, dynamic agent movement
import Phaser from "phaser";
import { ROOMS, type RoomId, deskPositions } from "./officeLayout";
import { AGENTS } from "./OfficeAssets";

// ── Layout ─────────────────────────────────────────────────────────────────
const TILE = 64;
const COLS = 15;
const ROWS = 12; // active rooms go up to row 10; 12 gives clean bottom margin
const WALL_STRIP = 26; // taller wall strip → room labels easier to read

// ── Agent home rooms ───────────────────────────────────────────────────────
// Marketing has 4 desk slots → maya/iris/teo/vera; lucio→pesquisa; otto→operacoes; sofia→pesquisa
const AGENT_HOME: Record<string, string> = {
  agata:  "gestao",
  bia:    "comercial",  carlos: "comercial",
  maya:   "marketing",  iris:   "marketing", teo:   "marketing", vera:  "marketing",
  lucio:  "pesquisa",   sofia:  "pesquisa",
  otto:   "operacoes",
  heitor: "ti",
};

// ── Character assignment per agent ────────────────────────────────────────
const AGENT_CHAR: Record<string, { char: string; desk: "black" | "white" }> = {
  agata:  { char: "Female1", desk: "black" },
  bia:    { char: "Female3", desk: "white" },
  carlos: { char: "Male1",   desk: "white" },
  maya:   { char: "Female3", desk: "black" },
  iris:   { char: "Female4", desk: "black" },
  teo:    { char: "Male2",   desk: "black" },
  vera:   { char: "Female2", desk: "white" },
  lucio:  { char: "Male4",   desk: "black" },
  sofia:  { char: "Female5", desk: "black" },
  otto:   { char: "Male3",   desk: "white" },
  heitor: { char: "Male1",   desk: "black" },
};

// Meeting seat order (active agents)
const MEETING_ORDER = ["agata","bia","carlos","maya","iris","teo","vera","lucio","sofia","otto","heitor"];

// ── Movement destinations ─────────────────────────────────────────────────
// Meeting room [6,5,10,6] → cols 6-10 rows 5-6 — expanded to fit 11 agents
const MEETING_SEATS: Array<{ x: number; y: number }> = [
  { x: 7 * TILE + 0,  y: 5 * TILE + 48 },
  { x: 7 * TILE + 48, y: 5 * TILE + 48 },
  { x: 8 * TILE + 32, y: 5 * TILE + 48 },
  { x: 9 * TILE + 16, y: 5 * TILE + 48 },
  { x: 9 * TILE + 56, y: 5 * TILE + 48 },
  { x: 7 * TILE + 0,  y: 6 * TILE + 8  },
  { x: 7 * TILE + 48, y: 6 * TILE + 8  },
  { x: 8 * TILE + 32, y: 6 * TILE + 8  },
  { x: 9 * TILE + 16, y: 6 * TILE + 8  },
  { x: 9 * TILE + 56, y: 6 * TILE + 8  },
  { x: 8 * TILE + 0,  y: 5 * TILE + 28 },
];

// Copa [1,5,3,6] → center x=160 y=384
const COPA_SPOTS: Array<{ x: number; y: number }> = [
  { x: 1 * TILE + 48, y: 5 * TILE + 50 },
  { x: 2 * TILE + 16, y: 5 * TILE + 50 },
  { x: 2 * TILE + 48, y: 6 * TILE + 12 },
];

// WC [4,5,5,6] → center x=320 y=384
const WC_SPOTS: Array<{ x: number; y: number }> = [
  { x: 4 * TILE + 28, y: 5 * TILE + 50 },
  { x: 4 * TILE + 48, y: 6 * TILE + 10 },
];

// ── Status colors (opensquad palette) ─────────────────────────────────────
const STATUS_HEX: Record<string, number> = {
  working:    0x60b0ff,
  meeting:    0xa78bfa,
  walking:    0xf59e0b,
  done:       0x70ff90,
  checkpoint: 0xffcc33,
  idle:       0xbbbbdd,
  coffee:     0xf97316,
  bathroom:   0x94a3b8,
  talking:    0x22d3ee,
};

export interface AgentState2D {
  agentKey: string;
  status?: string;
  currentJob?: string;
}

interface AgentView {
  container: Phaser.GameObjects.Container;
  avatar: Phaser.GameObjects.Image;
  deskImg: Phaser.GameObjects.Image;
  monitorImg: Phaser.GameObjects.Image;
  statusDot: Phaser.GameObjects.Arc;
  statusLabel: Phaser.GameObjects.Text;
  talkKey: string;
  blinkKey: string;
  animFrame: number;
  animTimer: Phaser.Time.TimerEvent;
  homeX: number;
  homeY: number;
  currentStatus: string;
}

export class OfficePixelScene2D extends Phaser.Scene {
  private views = new Map<string, AgentView>();

  constructor() {
    super({ key: "OfficePixelScene2D" });
  }

  // ── Asset loading ──────────────────────────────────────────────────────

  preload(): void {
    const base = "/assets";

    const chars = ["Female1","Female2","Female3","Female4","Female5","Male1","Male2","Male3","Male4"];
    for (const c of chars) {
      this.load.image(`${c}_talk`,  `${base}/avatars/${c}_talk.png`);
      this.load.image(`${c}_blink`, `${base}/avatars/${c}_blink.png`);
    }
    this.load.image("desk_wood",         `${base}/furniture/desk_wood.png`);
    this.load.image("desk_black_coding", `${base}/desks/desktop_set_black_down_coding.png`);
    this.load.image("desk_white_coding", `${base}/desks/desktop_set_white_down_coding.png`);
    this.load.image("monstera",          `${base}/furniture/monstera.png`);
    this.load.image("monstera_small",    `${base}/furniture/monstera_small.png`);
    this.load.image("plant1",            `${base}/furniture/plant1.png`);
    this.load.image("plant3",            `${base}/furniture/plant3.png`);
    this.load.image("plant_poof",        `${base}/furniture/plant_poof.png`);
    this.load.image("bookshelf",         `${base}/furniture/bookshelf_purple_tall.png`);
    this.load.image("whiteboard",        `${base}/furniture/whiteboard_stand_graph.png`);
    this.load.image("water_cooler",      `${base}/furniture/water_cooler_better.png`);
    this.load.image("coffee_mug",        `${base}/furniture/coffee_mug_blue.png`);
    this.load.image("coffeepot",          `${base}/furniture/coffeepot_right.png`);
    this.load.image("coffee_table_h",     `${base}/furniture/coffeetable_black_horizontal.png`);
  }

  // ── Scene creation ────────────────────────────────────────────────────

  create(): void {
    // NEAREST filter → crisp pixel art
    Object.values(this.textures.list).forEach((tex) => {
      if (tex.key !== "__DEFAULT" && tex.key !== "__MISSING") {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    const bg = this.add.graphics().setDepth(-10);
    bg.fillStyle(0x0f0e17, 1);
    bg.fillRect(0, 0, COLS * TILE, ROWS * TILE);

    const grid = this.add.graphics().setDepth(-5);
    grid.lineStyle(1, 0xffffff, 0.018);
    for (let c = 0; c <= COLS; c++) {
      grid.strokeLineShape(new Phaser.Geom.Line(c * TILE, 0, c * TILE, ROWS * TILE));
    }
    for (let r = 0; r <= ROWS; r++) {
      grid.strokeLineShape(new Phaser.Geom.Line(0, r * TILE, COLS * TILE, r * TILE));
    }

    this.drawRooms();
    this.placeAgents();
    this.placeFurniture();

    this.add.text(COLS * TILE / 2, 5, "INTELLIX HQ", {
      fontFamily: "monospace", fontSize: "9px",
      color: "rgba(148,163,184,0.25)",
    }).setOrigin(0.5, 0).setDepth(9999);

    // DRIVE door
    const door = this.add.graphics().setDepth(60);
    door.fillStyle(0xfbbf24, 1);
    door.fillRoundedRect(COLS * TILE - 7, 5 * TILE + 8, 7, 2 * TILE - 16, 2);
    this.add.text(COLS * TILE - 3, 6 * TILE + 2, "D\nR\nI\nV\nE", {
      fontFamily: "monospace", fontSize: "4px", color: "#78350f", lineSpacing: 1,
    }).setOrigin(0.5, 0.5).setDepth(61);
  }

  // ── Update loop ───────────────────────────────────────────────────────

  update(): void {
    const ext = this.registry.get("agentStates2D") as Record<string, AgentState2D> | undefined;
    if (!ext) return;

    this.views.forEach((view, key) => {
      const s = ext[key]?.status ?? "idle";
      const color = STATUS_HEX[s] ?? STATUS_HEX.idle;

      // Update badge colors
      view.statusDot.setFillStyle(color, 1);
      view.statusLabel
        .setColor("#" + color.toString(16).padStart(6, "0"))
        .setText(s);

      // Trigger movement only on status change
      if (s !== view.currentStatus) {
        view.currentStatus = s;
        this.moveAgentForStatus(key, view, s);
      }
    });
  }

  // ── Room rendering ────────────────────────────────────────────────────

  private drawRooms(): void {
    ROOMS.forEach((room) => this.paintRoom(room.rect, room.color, room.label));
  }

  private paintRoom(
    rect: [number, number, number, number],
    colorStr: string,
    label: string,
  ): void {
    const [cs, rs, ce, re] = rect;
    const colorHex = parseInt(colorStr.replace("#", ""), 16);
    const px = cs * TILE, py = rs * TILE;
    const pw = (ce - cs + 1) * TILE, ph = (re - rs + 1) * TILE;

    // Dark floor with subtle checkerboard
    const floor = this.add.graphics().setDepth(0);
    floor.fillStyle(0x1a1826, 1);
    floor.fillRect(px + 1, py + WALL_STRIP, pw - 2, ph - WALL_STRIP - 1);
    for (let dc = cs; dc <= ce; dc++) {
      for (let dr = rs; dr <= re; dr++) {
        if ((dc + dr) % 2 === 0) {
          floor.fillStyle(colorHex, 0.07);
          floor.fillRect(dc * TILE, dr * TILE, TILE, TILE);
        }
      }
    }
    // Shadow at base of wall
    floor.fillStyle(0x000000, 0.2);
    floor.fillRect(px + 1, py + WALL_STRIP, pw - 2, 8);

    // Colored wall strip (taller → room name easier to read)
    const wall = this.add.graphics().setDepth(1);
    wall.fillStyle(colorHex, 0.28);
    wall.fillRect(px + 1, py + 1, pw - 2, WALL_STRIP - 1);
    // Baseboard
    wall.fillStyle(colorHex, 0.6);
    wall.fillRect(px + 1, py + WALL_STRIP - 4, pw - 2, 4);
    wall.fillStyle(0xffffff, 0.06);
    wall.fillRect(px + 1, py + WALL_STRIP - 5, pw - 2, 1);

    // Room border
    const border = this.add.graphics().setDepth(2);
    border.lineStyle(1.5, colorHex, 0.6);
    border.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    // L-corner accent
    border.lineStyle(2, colorHex, 1);
    border.strokePoints(
      [{ x: px + 2, y: py + 20 }, { x: px + 2, y: py + 2 }, { x: px + 20, y: py + 2 }],
      false,
    );

    // Room label — dark pill ensures readability on any wall colour
    const lx = px + 4, ly = py + 4;
    const pillW = Math.min(pw - 6, label.length * 6 + 14);
    const pillBg = this.add.graphics().setDepth(6);
    pillBg.fillStyle(0x000000, 0.80);
    pillBg.fillRoundedRect(lx, ly, pillW, 15, 3);
    pillBg.lineStyle(1, colorHex, 0.55);
    pillBg.strokeRoundedRect(lx, ly, pillW, 15, 3);
    this.add.text(lx + 4, ly + 2, label, {
      fontFamily: "monospace",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setDepth(7);
  }

  // ── Agent placement ───────────────────────────────────────────────────

  private placeAgents(): void {
    const byRoom = new Map<string, typeof AGENTS[number][]>();
    AGENTS.forEach((a) => {
      const roomId = AGENT_HOME[a.key] ?? "operacoes";
      const list = byRoom.get(roomId) ?? [];
      list.push(a);
      byRoom.set(roomId, list);
    });

    byRoom.forEach((agents, roomId) => {
      const positions = deskPositions(roomId as RoomId, agents.length);
      agents.forEach((agent, i) => {
        const pos = positions[i];
        const col = pos?.col ?? 1;
        const row = pos?.row ?? 1;
        this.buildAgent(agent, col * TILE + TILE / 2, row * TILE + TILE / 2);
      });
    });
  }

  // ── Build one agent (Container-based so it can move as a unit) ─────────

  private buildAgent(agent: typeof AGENTS[number], sx: number, sy: number): void {
    const charInfo = AGENT_CHAR[agent.key] ?? { char: "Male1", desk: "black" as const };
    const talkKey  = `${charInfo.char}_talk`;
    const blinkKey = `${charInfo.char}_blink`;
    const monitorKey = charInfo.desk === "black" ? "desk_black_coding" : "desk_white_coding";

    // Container holds ALL parts → moves as one unit
    const container = this.add.container(sx, sy).setDepth(sy);

    // ── Depth order inside container (later = in front) ─────────────────
    // 1. avatar  — behind desk → lower body hidden → seated look
    // 2. desk    — in front of avatar
    // 3. monitor — on desk
    // 4. badge   — always on top

    // Avatar (1.2× → 58×61px on 64px tile, clearly readable)
    const avatar = this.add.image(0, -38, talkKey)
      .setOrigin(0.5, 0.5)
      .setScale(1.2);

    // Desk wood surface (0.75× — covers lower body)
    const deskImg = this.add.image(0, 0, "desk_wood")
      .setOrigin(0.5, 0.5)
      .setScale(0.75);

    // Monitor / coding desktop (0.95×)
    const monitorImg = this.add.image(0, -22, monitorKey)
      .setOrigin(0.5, 0.5)
      .setScale(0.95);

    // Name badge — dark pill above head
    const badgeW = 72, badgeH = 28;
    const badgeRelY = -100; // relative to container center

    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x14141c, 0.95);
    badgeBg.fillRoundedRect(-badgeW / 2, badgeRelY, badgeW, badgeH, 5);
    badgeBg.lineStyle(1, 0x6a5a80, 0.45);
    badgeBg.strokeRoundedRect(-badgeW / 2, badgeRelY, badgeW, badgeH, 5);

    const nameText = this.add.text(0, badgeRelY + 3, agent.name.split(" ")[0], {
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5, 0);

    // Status dot + label (positioned relative to container)
    const dotRelX = -badgeW / 2 + 10;
    const dotRelY = badgeRelY + badgeH - 8;

    const statusDot = this.add.arc(dotRelX, dotRelY, 3)
      .setFillStyle(STATUS_HEX.idle, 1);

    const statusLabel = this.add.text(dotRelX + 7, dotRelY - 6, "idle", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#bbbbdd",
      stroke: "#000000",
      strokeThickness: 2,
      resolution: 2,
    });

    container.add([avatar, deskImg, monitorImg, badgeBg, nameText, statusDot, statusLabel]);

    // Talk ↔ blink animation
    const animTimer = this.time.addEvent({
      delay: 550 + Math.random() * 350,
      loop: true,
      callback: () => {
        const view = this.views.get(agent.key);
        if (!view) return;
        view.animFrame = (view.animFrame + 1) % 2;
        view.avatar.setTexture(view.animFrame === 0 ? talkKey : blinkKey);
      },
    });

    this.views.set(agent.key, {
      container, avatar, deskImg, monitorImg,
      statusDot, statusLabel,
      talkKey, blinkKey,
      animFrame: 0, animTimer,
      homeX: sx, homeY: sy,
      currentStatus: "idle",
    });
  }

  // ── Status-driven movement ─────────────────────────────────────────────

  private moveAgentForStatus(key: string, view: AgentView, status: string): void {
    this.tweens.killTweensOf(view.container);

    let targetX = view.homeX;
    let targetY = view.homeY;
    const atDesk = status === "idle" || status === "working" || status === "checkpoint" || status === "done";

    if (status === "meeting" || status === "talking") {
      const idx = MEETING_ORDER.indexOf(key);
      const seat = MEETING_SEATS[Math.max(0, idx) % MEETING_SEATS.length];
      targetX = seat.x; targetY = seat.y;
    } else if (status === "coffee") {
      const spot = COPA_SPOTS[Math.floor(Math.random() * COPA_SPOTS.length)];
      targetX = spot.x; targetY = spot.y;
    } else if (status === "bathroom") {
      const spot = WC_SPOTS[Math.floor(Math.random() * WC_SPOTS.length)];
      targetX = spot.x; targetY = spot.y;
    } else if (status === "walking") {
      // Wander within home room
      targetX = view.homeX + (Math.random() - 0.5) * TILE * 1.5;
      targetY = view.homeY + (Math.random() - 0.5) * TILE;
    }

    // Hide desk/monitor when away from desk
    view.deskImg.setVisible(atDesk);
    view.monitorImg.setVisible(atDesk);

    this.tweens.add({
      targets: view.container,
      x: targetX,
      y: targetY,
      duration: 700 + Math.random() * 400,
      ease: "Power2.easeInOut",
      onUpdate: () => {
        // Y-sort depth during movement
        view.container.setDepth(view.container.y + 38);
      },
      onComplete: () => {
        // Return to desk after temporary states
        if (status === "walking" || status === "coffee" || status === "bathroom") {
          this.time.delayedCall(3000 + Math.random() * 2000, () => {
            const current = this.views.get(key);
            if (current && current.currentStatus === status) {
              this.moveAgentToHome(key, current);
            }
          });
        }
      },
    });
  }

  private moveAgentToHome(key: string, view: AgentView): void {
    this.tweens.killTweensOf(view.container);
    view.deskImg.setVisible(true);
    view.monitorImg.setVisible(true);
    this.tweens.add({
      targets: view.container,
      x: view.homeX,
      y: view.homeY,
      duration: 700 + Math.random() * 300,
      ease: "Power2.easeInOut",
      onUpdate: () => view.container.setDepth(view.container.y + 38),
      onComplete: () => view.container.setDepth(view.homeY + 38),
    });
    void key; // suppress unused var warning
  }

  // ── Room decoration ───────────────────────────────────────────────────

  private placeFurniture(): void {
    const img = (x: number, y: number, key: string, scale: number) =>
      this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setDepth(y);

    // Corner plants in each departmental room
    ROOMS.forEach((room) => {
      if (!room.isDept) return;
      const [cs, rs, ce, re] = room.rect;
      img(cs * TILE + 10,        rs * TILE + TILE,      "monstera_small", 0.85);
      img((ce + 1) * TILE - 10,  (re + 1) * TILE - 6,   "plant1",         0.85);
    });

    // Copa coffee station (coffeepot + table + mug)
    const copa = ROOMS.find(r => r.id === "copa");
    if (copa) {
      const [cs, rs] = copa.rect;
      const cx = cs * TILE + TILE * 1.5;
      img(cx - 10, rs * TILE + TILE * 0.9, "coffee_table_h", 1.0);
      img(cx - 10, rs * TILE + TILE * 0.7, "coffeepot", 0.85);
      img(cx + 24, rs * TILE + TILE * 0.8, "coffee_mug", 0.9);
    }

    // WC plant
    const wc = ROOMS.find(r => r.id === "wc");
    if (wc) {
      const [cs, rs] = wc.rect;
      img(cs * TILE + TILE * 0.55, rs * TILE + TILE, "monstera_small", 0.75);
    }

    // Meeting room whiteboard + conference table
    const meeting = ROOMS.find(r => r.id === "meeting");
    if (meeting) {
      const [cs, rs, ce, re] = meeting.rect;
      img(cs * TILE + TILE, rs * TILE + TILE + 4, "whiteboard", 1.5);
      // Conference table (drawn behind agents)
      const tx = ((cs + ce + 1) / 2) * TILE;
      const ty = ((rs + re + 1) / 2) * TILE - 4;
      const tw = 180, th = 42;
      const tableG = this.add.graphics().setDepth(ty - 30);
      tableG.fillStyle(0x3a2515, 1);
      tableG.fillRoundedRect(tx - tw / 2, ty - th / 2, tw, th, 10);
      tableG.lineStyle(2, 0x6b4230, 1);
      tableG.strokeRoundedRect(tx - tw / 2, ty - th / 2, tw, th, 10);
      // Surface sheen
      tableG.fillStyle(0x5c3a22, 0.35);
      tableG.fillRoundedRect(tx - tw / 2 + 5, ty - th / 2 + 4, tw - 10, th - 8, 7);
    }

    // Gestão water cooler + extra empty desk
    const gestao = ROOMS.find(r => r.id === "gestao");
    if (gestao) {
      const [cs, rs, ce, re] = gestao.rect;
      img((ce + 1) * TILE - 8, (rs + re) / 2 * TILE + TILE * 0.5, "water_cooler", 1.1);
      // Second empty desk in gestão — row 9 (Ágata sits at row 8 from deskPositions)
      const ex = (cs + 1) * TILE + TILE / 2;
      const ey = (rs + 2) * TILE + TILE / 2;
      this.add.image(ex, ey, "desk_wood")
        .setOrigin(0.5, 0.5).setScale(0.75).setDepth(ey + 1);
      this.add.image(ex, ey - 22, "desk_white_coding")
        .setOrigin(0.5, 0.5).setScale(0.95).setDepth(ey + 2);
    }

  }
}

import Phaser from "phaser";
import {
  CELL,
  GRID_COLS,
  GRID_ROWS,
  ROLE_COLORS,
  ROOMS,
  deskPositions,
  roomForSquad,
  type RoomId,
} from "./officeFloorplan";

export interface AgentSprite {
  id: string;
  name: string;
  role: string;
  squad: string;
}

export type OfficeMode = "2d" | "iso";

const W = GRID_COLS * CELL;
const H = GRID_ROWS * CELL;

// Half-iso projection for 3D mode
const ISO_X = 0.78;
const ISO_Y = 0.45;
function toIso(px: number, py: number): { x: number; y: number } {
  const cx = W / 2;
  return {
    x: cx + (px - py) * ISO_X,
    y: (px + py) * ISO_Y,
  };
}

// IntelliX surface tones
const FLOOR_WOOD = 0x1a1a24;
const FLOOR_WOOD_ALT = 0x20202c;
const WALL = 0x2a2a3a;
const DESK_TOP = 0x3a2e22;       // warm wood top
const DESK_TOP_DARK = 0x2a2118;
const MONITOR_FRAME = 0x0a0a0f;
const MONITOR_SCREEN_ON = 0x06b6d4;
const MONITOR_SCREEN_OFF = 0x1e293b;
const CHAIR = 0x4b3a2c;
const KEYBOARD = 0x64748b;

interface AgentNode {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  screen: Phaser.GameObjects.Rectangle;
  pulse?: Phaser.Tweens.Tween;
}

export class OfficeScene extends Phaser.Scene {
  private mode: OfficeMode = "2d";
  private agents: AgentSprite[] = [];
  private nodes = new Map<string, AgentNode>();
  private ready = false;
  private tooltip!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private offsetX = 0;
  private offsetY = 0;

  constructor() {
    super("OfficeScene");
  }

  init(data: { mode?: OfficeMode; agents?: AgentSprite[] }) {
    this.mode = data?.mode ?? "2d";
    if (data?.agents) this.agents = data.agents;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0a0a0f");

    // Center the floor plan
    const worldW = this.mode === "2d" ? W : W * 1.4;
    const worldH = this.mode === "2d" ? H : (W + H) * ISO_Y + 60;
    this.offsetX = (width - worldW) / 2 + (this.mode === "iso" ? worldW / 2 - W / 2 : 0);
    this.offsetY = this.mode === "2d" ? (height - worldH) / 2 : 50;

    const root = this.add.container(this.offsetX, this.offsetY);

    // Wood floor (checker pattern)
    if (this.mode === "2d") {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const color = (r + c) % 2 === 0 ? FLOOR_WOOD : FLOOR_WOOD_ALT;
          root.add(
            this.add.rectangle(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL, CELL, color),
          );
        }
      }
    } else {
      // simple iso floor base
      const tl = toIso(0, 0);
      const tr = toIso(W, 0);
      const br = toIso(W, H);
      const bl = toIso(0, H);
      const floor = this.add.polygon(
        0,
        0,
        [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y],
        FLOOR_WOOD,
        1,
      );
      floor.setOrigin(0, 0);
      root.add(floor);
    }

    // Rooms (walls + label + furniture)
    ROOMS.forEach((room) => this.drawRoom(root, room));

    // Tooltip overlay (not in root)
    this.tooltipBg = this.add
      .rectangle(0, 0, 10, 10, 0x13131a, 0.96)
      .setStrokeStyle(1, 0x7c3aed, 0.9)
      .setVisible(false)
      .setDepth(1000);
    this.tooltip = this.add
      .text(0, 0, "", { fontSize: "11px", color: "#f1f5f9", padding: { x: 6, y: 4 } })
      .setVisible(false)
      .setDepth(1001);

    this.ready = true;
    this.renderAgents();
  }

  private drawRoom(root: Phaser.GameObjects.Container, room: typeof ROOMS[number]) {
    const [cs, rs, ce, re] = room.rect;
    const x = cs * CELL;
    const y = rs * CELL;
    const w = (ce - cs + 1) * CELL;
    const h = (re - rs + 1) * CELL;
    const colorInt = Phaser.Display.Color.HexStringToColor(room.color).color;

    if (this.mode === "2d") {
      // Tinted floor area
      const tint = this.add.rectangle(x + w / 2, y + h / 2, w - 4, h - 4, colorInt, 0.08);
      root.add(tint);

      // Walls (4 thin rectangles)
      const wallT = 4;
      root.add(this.add.rectangle(x + w / 2, y, w, wallT, WALL).setOrigin(0.5, 0));
      root.add(this.add.rectangle(x + w / 2, y + h, w, wallT, WALL).setOrigin(0.5, 1));
      root.add(this.add.rectangle(x, y + h / 2, wallT, h, WALL).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x + w, y + h / 2, wallT, h, WALL).setOrigin(1, 0.5));

      // Colored corner stripe (department accent)
      root.add(this.add.rectangle(x, y, 6, h, colorInt, 0.9).setOrigin(0, 0));

      // Label pill at top-left of room
      const labelW = Math.min(w - 16, room.label.length * 7 + 16);
      root.add(
        this.add.rectangle(x + 8 + labelW / 2, y + 12, labelW, 18, colorInt, 0.95).setOrigin(0.5),
      );
      root.add(
        this.add
          .text(x + 8 + labelW / 2, y + 12, room.label, {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#0a0a0f",
            fontStyle: "bold",
          })
          .setOrigin(0.5),
      );

      // Department-specific furniture
      if (room.isDept && room.desks > 0) {
        const positions = deskPositions(room.id, room.desks);
        positions.forEach((p) => this.drawDesk2D(root, p.col, p.row));
      } else if (room.id === "meeting") {
        this.drawMeetingTable2D(root, x, y, w, h);
      } else if (room.id === "copa") {
        this.drawCopa2D(root, x, y, w, h);
      } else if (room.id === "wc") {
        this.drawWC2D(root, x, y, w, h);
      }
    } else {
      // ISO mode
      const tl = toIso(x, y);
      const tr = toIso(x + w, y);
      const br = toIso(x + w, y + h);
      const bl = toIso(x, y + h);
      const wallH = 26;
      const wallBack = Phaser.Display.Color.ValueToColor(colorInt).darken(50).color;
      const wallSide = Phaser.Display.Color.ValueToColor(colorInt).darken(70).color;

      // Back wall
      root.add(
        this.add
          .polygon(0, 0, [tl.x, tl.y - wallH, tr.x, tr.y - wallH, tr.x, tr.y, tl.x, tl.y], wallBack, 0.9)
          .setOrigin(0, 0),
      );
      // Side wall (right)
      root.add(
        this.add
          .polygon(0, 0, [tr.x, tr.y - wallH, br.x, br.y - wallH, br.x, br.y, tr.x, tr.y], wallSide, 0.9)
          .setOrigin(0, 0),
      );
      // Floor tinted
      const floor = this.add.polygon(
        0,
        0,
        [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y],
        colorInt,
        0.18,
      );
      floor.setOrigin(0, 0);
      floor.setStrokeStyle(1.5, colorInt, 0.85);
      root.add(floor);

      // Label pill
      const lblPos = toIso(x + Math.min(w, CELL * 2.2) / 2, y);
      const labelW = Math.min(80, room.label.length * 7 + 14);
      root.add(
        this.add
          .rectangle(lblPos.x, lblPos.y - wallH - 4, labelW, 18, colorInt, 0.95)
          .setOrigin(0.5),
      );
      root.add(
        this.add
          .text(lblPos.x, lblPos.y - wallH - 4, room.label, {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#0a0a0f",
            fontStyle: "bold",
          })
          .setOrigin(0.5),
      );

      if (room.isDept && room.desks > 0) {
        deskPositions(room.id, room.desks).forEach((p) => this.drawDeskIso(root, p.col, p.row));
      }
    }
  }

  private drawDesk2D(root: Phaser.GameObjects.Container, col: number, row: number) {
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    // Desk top
    root.add(this.add.rectangle(cx, cy - 4, 44, 22, DESK_TOP).setStrokeStyle(1, DESK_TOP_DARK));
    // Monitor base
    root.add(this.add.rectangle(cx, cy - 10, 8, 3, MONITOR_FRAME));
    // Monitor screen
    root.add(
      this.add
        .rectangle(cx, cy - 14, 26, 14, MONITOR_FRAME)
        .setStrokeStyle(1, 0x334155),
    );
    root.add(this.add.rectangle(cx, cy - 14, 22, 10, MONITOR_SCREEN_OFF));
    // Keyboard
    root.add(this.add.rectangle(cx, cy + 2, 22, 4, KEYBOARD));
    // Chair (below desk)
    root.add(this.add.rectangle(cx, cy + 18, 18, 14, CHAIR).setStrokeStyle(1, 0x2a2118));
    root.add(this.add.circle(cx, cy + 26, 3, 0x1f2937));
  }

  private drawDeskIso(root: Phaser.GameObjects.Container, col: number, row: number) {
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    const c = toIso(cx, cy);
    root.add(this.add.ellipse(c.x, c.y - 2, 36, 18, DESK_TOP).setStrokeStyle(1, DESK_TOP_DARK));
    root.add(this.add.rectangle(c.x, c.y - 12, 18, 12, MONITOR_FRAME).setStrokeStyle(1, 0x334155));
    root.add(this.add.rectangle(c.x, c.y - 12, 14, 8, MONITOR_SCREEN_OFF));
    root.add(this.add.ellipse(c.x, c.y + 12, 16, 10, CHAIR));
  }

  private drawMeetingTable2D(
    root: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    root.add(this.add.ellipse(cx, cy + 4, w - 60, h - 30, DESK_TOP).setStrokeStyle(2, DESK_TOP_DARK));
    // 6 chairs around
    const positions = [
      [cx - w / 4, cy - h / 3],
      [cx, cy - h / 3],
      [cx + w / 4, cy - h / 3],
      [cx - w / 4, cy + h / 3],
      [cx, cy + h / 3],
      [cx + w / 4, cy + h / 3],
    ];
    positions.forEach(([px, py]) => {
      root.add(this.add.rectangle(px, py, 16, 12, CHAIR));
    });
  }

  private drawCopa2D(
    root: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    // Counter
    root.add(this.add.rectangle(x + w / 2, y + 26, w - 16, 14, 0x475569));
    // Coffee machine
    root.add(this.add.rectangle(x + 20, y + 20, 12, 14, 0x1f2937));
    root.add(this.add.circle(x + 20, y + 22, 3, 0x06b6d4));
    // Round table
    root.add(this.add.circle(x + w / 2 + 10, y + h - 22, 14, DESK_TOP).setStrokeStyle(1, DESK_TOP_DARK));
  }

  private drawWC2D(
    root: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    root.add(this.add.rectangle(x + w / 2, y + h / 2, 14, 18, 0xe2e8f0).setStrokeStyle(1, 0x94a3b8));
    root.add(this.add.circle(x + w / 2, y + h / 2 - 3, 4, 0x94a3b8));
  }

  setMode(mode: OfficeMode) {
    if (this.mode === mode) return;
    this.scene.restart({ mode, agents: this.agents });
  }

  setAgents(agents: AgentSprite[]) {
    this.agents = agents;
    if (this.ready) this.renderAgents();
  }

  private agentWorld(col: number, row: number): { x: number; y: number } {
    const px = col * CELL + CELL / 2;
    const py = row * CELL + CELL / 2 + 18; // sit on chair, below desk
    if (this.mode === "2d") return { x: this.offsetX + px, y: this.offsetY + py };
    const iso = toIso(px, py - 6);
    return { x: this.offsetX + iso.x, y: this.offsetY + iso.y };
  }

  private renderAgents() {
    this.nodes.forEach((n) => {
      n.container.destroy();
      n.pulse?.stop();
    });
    this.nodes.clear();

    if (this.agents.length === 0) {
      const { width, height } = this.scale;
      this.add
        .text(width / 2, height - 24, "Sem agentes configurados", {
          fontSize: "12px",
          color: "#64748b",
        })
        .setOrigin(0.5);
      return;
    }

    // Group by room and seat at desks
    const byRoom = new Map<RoomId, AgentSprite[]>();
    this.agents.forEach((a) => {
      const r = roomForSquad(a.squad);
      const arr = byRoom.get(r) ?? [];
      arr.push(a);
      byRoom.set(r, arr);
    });

    byRoom.forEach((list, roomId) => {
      const positions = deskPositions(roomId, Math.max(list.length, 1));
      list.forEach((a, idx) => {
        const cell = positions[idx % positions.length];
        const { x, y } = this.agentWorld(cell.col, cell.row);
        const color = ROLE_COLORS[a.role] ?? ROLE_COLORS.default;

        const container = this.add.container(x, y).setDepth(50);
        const shadow = this.add.ellipse(0, 8, 22, 6, 0x000000, 0.5);
        const body = this.add
          .circle(0, 0, 11, color)
          .setStrokeStyle(2, 0xffffff, 0.85)
          .setInteractive({ useHandCursor: true });
        const initials = this.add
          .text(0, 0, (a.name?.[0] ?? "?").toUpperCase(), {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#0a0a0f",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        const label = this.add
          .text(0, 18, a.name, {
            fontFamily: "Inter, sans-serif",
            fontSize: "9px",
            color: "#e2e8f0",
            backgroundColor: "#0a0a0fcc",
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5);
        container.add([shadow, body, initials, label]);

        // Reference to the monitor screen for "active" pulse:
        // recreate the screen overlay so we can flip its color when active.
        const screenY = -34; // above the agent, on the monitor
        const screen = this.add.rectangle(0, screenY, 22, 10, MONITOR_SCREEN_OFF);
        container.add(screen);

        body.on("pointerover", () => {
          this.tooltip.setText(`${a.name}\n${a.role} · ${a.squad}`);
          const b = this.tooltip.getBounds();
          this.tooltipBg
            .setPosition(x + b.width / 2 + 14, y - 36)
            .setSize(b.width + 8, b.height + 4)
            .setVisible(true);
          this.tooltip.setPosition(x + 14, y - 44).setVisible(true);
        });
        body.on("pointerout", () => {
          this.tooltip.setVisible(false);
          this.tooltipBg.setVisible(false);
        });

        this.nodes.set(a.id, { container, body, screen });
      });
    });
  }

  setActive(agentId: string, active: boolean) {
    const node = this.nodes.get(agentId);
    if (!node) return;
    if (active && !node.pulse) {
      node.screen.setFillStyle(MONITOR_SCREEN_ON);
      node.pulse = this.tweens.add({
        targets: node.body,
        scale: { from: 1, to: 1.25 },
        alpha: { from: 1, to: 0.7 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      node.body.setStrokeStyle(3, 0x06b6d4, 1);
    } else if (!active && node.pulse) {
      node.pulse.stop();
      node.pulse = undefined;
      node.body.setScale(1).setAlpha(1).setStrokeStyle(2, 0xffffff, 0.85);
      node.screen.setFillStyle(MONITOR_SCREEN_OFF);
    }
  }
}

import Phaser from "phaser";
import {
  CELL,
  GRID_COLS,
  GRID_ROWS,
  ROLE_COLORS,
  ROOMS,
  deskPositions,
  roomForSquad,
} from "./officeFloorplan";

export interface AgentSprite {
  id: string;
  name: string;
  role: string;
  squad: string;
  x?: number;
  y?: number;
}

export type OfficeMode = "2d" | "iso";

const W = GRID_COLS * CELL;
const H = GRID_ROWS * CELL;

// Isometric projection — we use a half-iso (dimetric) for readability.
const ISO_X = 0.7;
const ISO_Y = 0.42;
function toIso(px: number, py: number): { x: number; y: number } {
  const cx = W / 2;
  return {
    x: cx + (px - py) * ISO_X,
    y: (px + py) * ISO_Y,
  };
}

export class OfficeScene extends Phaser.Scene {
  private mode: OfficeMode = "2d";
  private agents: AgentSprite[] = [];
  private nodes = new Map<
    string,
    { container: Phaser.GameObjects.Container; pulse?: Phaser.Tweens.Tween; circle: Phaser.GameObjects.Arc }
  >();
  private ready = false;
  private tooltip!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Rectangle;

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

    // Compute world bounds depending on mode and center it
    const worldW = this.mode === "2d" ? W : W + 200;
    const worldH = this.mode === "2d" ? H : (W + H) * ISO_Y + 80;
    const offsetX = (width - worldW) / 2;
    const offsetY = this.mode === "2d" ? (height - worldH) / 2 : 60;

    const root = this.add.container(offsetX, offsetY);

    // Subtle grid background
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a24, 0.7);
    if (this.mode === "2d") {
      for (let c = 0; c <= GRID_COLS; c += 1) {
        grid.lineBetween(c * CELL, 0, c * CELL, H);
      }
      for (let r = 0; r <= GRID_ROWS; r += 1) {
        grid.lineBetween(0, r * CELL, W, r * CELL);
      }
    } else {
      // iso grid
      for (let c = 0; c <= GRID_COLS; c += 1) {
        const a = toIso(c * CELL, 0);
        const b = toIso(c * CELL, H);
        grid.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (let r = 0; r <= GRID_ROWS; r += 1) {
        const a = toIso(0, r * CELL);
        const b = toIso(W, r * CELL);
        grid.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    root.add(grid);

    // Rooms
    ROOMS.forEach((room) => {
      const [cs, rs, ce, re] = room.rect;
      const x = cs * CELL;
      const y = rs * CELL;
      const w = (ce - cs + 1) * CELL;
      const h = (re - rs + 1) * CELL;
      const colorInt = Phaser.Display.Color.HexStringToColor(room.color).color;

      if (this.mode === "2d") {
        const fill = this.add
          .rectangle(x + w / 2, y + h / 2, w - 6, h - 6, colorInt, 0.16)
          .setStrokeStyle(2, colorInt, 0.85);
        root.add(fill);

        // desks
        if (room.isDept && room.desks > 0) {
          const positions = deskPositions(room.id, room.desks);
          positions.forEach((p) => {
            const dx = p.col * CELL + CELL / 2;
            const dy = p.row * CELL + CELL / 2 + 14;
            const desk = this.add.rectangle(dx, dy, 36, 18, 0x13131a).setStrokeStyle(1, 0x2a2a3a);
            root.add(desk);
          });
        }

        // label pill
        const labelBg = this.add
          .rectangle(x + 8 + 38, y + 14, 76, 18, colorInt, 0.95)
          .setOrigin(0.5);
        const label = this.add
          .text(x + 8 + 38, y + 14, room.label, {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#0a0a0f",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        root.add(labelBg);
        root.add(label);
      } else {
        // ISO: draw a polygon (parallelogram) for the floor + a small wall offset
        const tl = toIso(x, y);
        const tr = toIso(x + w, y);
        const br = toIso(x + w, y + h);
        const bl = toIso(x, y + h);
        const wallH = 22;
        // wall (back) — slightly darker
        const wallColor = Phaser.Display.Color.ValueToColor(colorInt).darken(40).color;
        const wall = this.add.polygon(
          0,
          0,
          [tl.x, tl.y - wallH, tr.x, tr.y - wallH, tr.x, tr.y, tl.x, tl.y],
          wallColor,
          0.55,
        );
        wall.setOrigin(0, 0);
        root.add(wall);
        const sideWall = this.add.polygon(
          0,
          0,
          [tr.x, tr.y - wallH, br.x, br.y - wallH, br.x, br.y, tr.x, tr.y],
          Phaser.Display.Color.ValueToColor(colorInt).darken(60).color,
          0.55,
        );
        sideWall.setOrigin(0, 0);
        root.add(sideWall);

        // floor
        const floor = this.add.polygon(
          0,
          0,
          [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y],
          colorInt,
          0.22,
        );
        floor.setOrigin(0, 0);
        floor.setStrokeStyle(1.5, colorInt, 0.85);
        root.add(floor);

        // desks
        if (room.isDept && room.desks > 0) {
          deskPositions(room.id, room.desks).forEach((p) => {
            const dx = p.col * CELL + CELL / 2;
            const dy = p.row * CELL + CELL / 2 + 6;
            const c = toIso(dx, dy);
            const desk = this.add
              .ellipse(c.x, c.y, 30, 14, 0x13131a)
              .setStrokeStyle(1, 0x2a2a3a);
            root.add(desk);
          });
        }

        // label
        const lblPos = toIso(x + CELL * 0.6, y + CELL * 0.5);
        const labelBg = this.add
          .rectangle(lblPos.x, lblPos.y - wallH - 2, 80, 18, colorInt, 0.95)
          .setOrigin(0.5);
        const label = this.add
          .text(lblPos.x, lblPos.y - wallH - 2, room.label, {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#0a0a0f",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        root.add(labelBg);
        root.add(label);
      }
    });

    // Drive door (right edge near meeting room)
    if (this.mode === "2d") {
      const door = this.add.rectangle(W - 6, 6 * CELL - CELL / 2, 10, CELL - 8, 0xfbbf24);
      root.add(door);
      const dl = this.add.text(W - 50, 6 * CELL - CELL - 4, "DRIVE", {
        fontSize: "9px",
        color: "#fbbf24",
        fontFamily: "monospace",
      });
      root.add(dl);
    }

    // Tooltip (lives outside root so it ignores transforms)
    this.tooltipBg = this.add
      .rectangle(0, 0, 10, 10, 0x13131a, 0.96)
      .setStrokeStyle(1, 0x7c3aed, 0.9)
      .setVisible(false)
      .setDepth(100);
    this.tooltip = this.add
      .text(0, 0, "", { fontSize: "11px", color: "#f1f5f9", padding: { x: 6, y: 4 } })
      .setVisible(false)
      .setDepth(101);

    // Store root offset for agent placement
    this.data.set("offsetX", offsetX);
    this.data.set("offsetY", offsetY);

    this.ready = true;
    this.renderAgents();
  }

  setMode(mode: OfficeMode) {
    if (this.mode === mode) return;
    this.scene.restart({ mode, agents: this.agents });
  }

  setAgents(agents: AgentSprite[]) {
    this.agents = agents;
    if (this.ready) this.renderAgents();
  }

  private worldPoint(col: number, row: number): { x: number; y: number } {
    const offsetX = this.data.get("offsetX") as number;
    const offsetY = this.data.get("offsetY") as number;
    const px = col * CELL + CELL / 2;
    const py = row * CELL + CELL / 2;
    if (this.mode === "2d") return { x: offsetX + px, y: offsetY + py };
    const iso = toIso(px, py);
    return { x: offsetX + iso.x, y: offsetY + iso.y - 6 };
  }

  private renderAgents() {
    this.nodes.forEach((n) => {
      n.container.destroy();
      n.pulse?.stop();
    });
    this.nodes.clear();

    if (this.agents.length === 0) {
      const { width, height } = this.scale;
      const t = this.add
        .text(width / 2, height / 2, "Sem agentes configurados", {
          fontSize: "13px",
          color: "#64748b",
        })
        .setOrigin(0.5);
      this.nodes.set("__empty__", { container: t as unknown as Phaser.GameObjects.Container, circle: t as unknown as Phaser.GameObjects.Arc });
      return;
    }

    // Group by room
    const byRoom = new Map<string, AgentSprite[]>();
    this.agents.forEach((a) => {
      const r = roomForSquad(a.squad);
      const arr = byRoom.get(r) ?? [];
      arr.push(a);
      byRoom.set(r, arr);
    });

    byRoom.forEach((list, roomId) => {
      const positions = deskPositions(roomId as never, list.length);
      list.forEach((a, idx) => {
        const cell = positions[idx] ?? positions[positions.length - 1] ?? { col: 7, row: 5 };
        const { x, y } = this.worldPoint(cell.col, cell.row);
        const color = ROLE_COLORS[a.role] ?? ROLE_COLORS.default;

        const container = this.add.container(x, y);
        const shadow = this.add.ellipse(0, 10, 28, 8, 0x000000, 0.4);
        const circle = this.add
          .circle(0, 0, 13, color)
          .setStrokeStyle(2, 0xffffff, 0.8)
          .setInteractive({ useHandCursor: true });
        const initials = this.add
          .text(0, 0, (a.name?.[0] ?? "?").toUpperCase(), {
            fontFamily: "Inter, sans-serif",
            fontSize: "11px",
            color: "#0a0a0f",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        const label = this.add
          .text(0, 22, a.name, { fontSize: "10px", color: "#e2e8f0" })
          .setOrigin(0.5);
        container.add([shadow, circle, initials, label]);

        circle.on("pointerover", () => {
          this.tooltip.setText(`${a.name}\n${a.role} · ${a.squad}`);
          const b = this.tooltip.getBounds();
          this.tooltipBg
            .setPosition(x + b.width / 2 + 14, y - 32)
            .setSize(b.width + 8, b.height + 4)
            .setVisible(true);
          this.tooltip.setPosition(x + 14, y - 40).setVisible(true);
        });
        circle.on("pointerout", () => {
          this.tooltip.setVisible(false);
          this.tooltipBg.setVisible(false);
        });

        this.nodes.set(a.id, { container, circle });
      });
    });
  }

  setActive(agentId: string, active: boolean) {
    const node = this.nodes.get(agentId);
    if (!node || !node.circle?.setStrokeStyle) return;
    if (active && !node.pulse) {
      node.pulse = this.tweens.add({
        targets: node.circle,
        scale: { from: 1, to: 1.4 },
        alpha: { from: 1, to: 0.7 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      node.circle.setStrokeStyle(3, 0x06b6d4, 1);
    } else if (!active && node.pulse) {
      node.pulse.stop();
      node.pulse = undefined;
      node.circle.setScale(1).setAlpha(1).setStrokeStyle(2, 0xffffff, 0.8);
    }
  }
}

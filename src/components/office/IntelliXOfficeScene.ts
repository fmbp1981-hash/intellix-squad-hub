// IntelliXOfficeScene.ts — main Phaser scene
import Phaser from "phaser";
import { isoToScreen, ROOM_WAYPOINTS, ROOMS, RoomKey } from "./IsoUtils";
import { AGENTS, createAgentTexture, loadAgentSpritesFromDB } from "./OfficeAssets";
import { RoomBuilder } from "./RoomBuilder";
import { FurnitureFactory } from "./FurnitureFactory";
import { AgentSprite, AgentBehaviorState } from "./AgentSprite";
import { BehaviorController } from "./BehaviorController";

export interface SquadRunInfo {
  id: string;
  name: string;
  color?: number;
}

export interface ExternalAgentState {
  status?: AgentBehaviorState;
  currentJob?: string;
}

interface Entry {
  agent: AgentSprite;
  controller: BehaviorController;
}

export class IntelliXOfficeScene extends Phaser.Scene {
  private agents: Map<string, Entry> = new Map();
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragMoved = false;
  private clickHandler?: (key: string) => void;
  private deliveryBanner?: Phaser.GameObjects.Container;
  private currentSquadRunId: string | null = null;

  constructor() {
    super({ key: "IntelliXOfficeScene" });
  }

  setClickHandler(fn: (agentKey: string) => void) {
    this.clickHandler = fn;
  }

  async create(): Promise<void> {
    this.buildBackground();
    new RoomBuilder(this).buildAll();
    new FurnitureFactory(this).buildAll();

    await loadAgentSpritesFromDB(this);

    AGENTS.forEach((a) => {
      const wp = ROOM_WAYPOINTS[a.homeRoom as RoomKey] ?? { tileX: 6, tileY: 6 };
      // small jitter so all agents don't overlap on respawn
      const start = {
        tileX: wp.tileX + (Math.random() - 0.5) * 0.4,
        tileY: wp.tileY + (Math.random() - 0.5) * 0.4,
      };
      const sprite = new AgentSprite(this, a, start);
      sprite.onClick = () => this.clickHandler?.(a.key);
      const controller = new BehaviorController(sprite);
      this.agents.set(a.key, { agent: sprite, controller });
      this.time.delayedCall(Math.random() * 4000, () => controller.start());
    });

    this.setupCamera();
    this.setupInput();
  }

  update(_time: number, delta: number): void {
    // External agent states (Realtime jobs)
    const ext = this.registry.get("agentStates") as Record<string, ExternalAgentState> | undefined;
    if (ext) {
      this.agents.forEach((entry, key) => {
        const e = ext[key];
        if (e?.status) entry.controller.setExternalState(e.status);
        else entry.controller.setExternalState(null);
      });
    }
    this.agents.forEach((entry) => entry.controller.update(delta));

    // Squad run banner sync
    const run = this.registry.get("squadRun") as SquadRunInfo | null | undefined;
    const runId = run?.id ?? null;
    if (runId !== this.currentSquadRunId) {
      this.currentSquadRunId = runId;
      this.updateDeliveryBanner(run ?? null);
    }
  }

  private updateDeliveryBanner(run: SquadRunInfo | null): void {
    if (this.deliveryBanner) {
      this.deliveryBanner.destroy();
      this.deliveryBanner = undefined;
    }
    if (!run) return;
    const wp = ROOM_WAYPOINTS.delivery;
    const { x, y } = isoToScreen(wp.tileX, wp.tileY);
    const c = this.add.container(x, y - 110);
    const label = this.add.text(0, 0, `🚀  ${run.name}`, {
      fontFamily: "Inter, sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);
    const padX = 14, padY = 6;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;
    const bg = this.add.graphics();
    const color = run.color ?? 0x5b21b6;
    bg.fillStyle(color, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(1, 0xffffff, 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    c.add([bg, label]);
    c.setDepth(9998);
    this.tweens.add({
      targets: c, scaleX: 1.04, scaleY: 1.04, duration: 1100,
      yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    this.deliveryBanner = c;
  }

  private buildBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0D1B2A, 0x0D1B2A, 0x060D17, 0x060D17, 1);
    bg.fillRect(-800, -500, 3200, 2400);
    bg.setDepth(-100);
    bg.setScrollFactor(1);

    // Subtle iso grid (extended to cover new larger layout)
    const grid = this.add.graphics();
    grid.lineStyle(0.5, 0xffffff, 0.04);
    for (let i = -2; i <= 24; i++) {
      const a = isoToScreen(i, -2);
      const b = isoToScreen(i, 24);
      grid.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
      const c = isoToScreen(-2, i);
      const d = isoToScreen(24, i);
      grid.strokeLineShape(new Phaser.Geom.Line(c.x, c.y, d.x, d.y));
    }
    grid.setDepth(-50);
  }

  private setupCamera(): void {
    this.cameras.main.setBackgroundColor(0x0D1B2A);
    // Bounds must be larger than viewport (2400×1360 at zoom 0.5) to allow centering.
    // Layout spans world x: -384 to 640, y: -40 to 640. Add generous padding.
    this.cameras.main.setBounds(-1200, -500, 3200, 2000);
    // Zoom out to see all 3 rows of islands at once
    this.cameras.main.setZoom(0.5);
    // Center on the midpoint of the full layout content (world ≈128,288 = tile ~11,7)
    const { x, y } = isoToScreen(11, 7);
    this.cameras.main.centerOn(x, y);
  }

  private setupInput(): void {
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStart = { x: ptr.x, y: ptr.y };
    });
    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dx = ptr.x - this.dragStart.x;
      const dy = ptr.y - this.dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.dragMoved = true;
      this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
      this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
      this.dragStart = { x: ptr.x, y: ptr.y };
    });
    this.input.on("pointerup", () => { this.isDragging = false; });

    this.input.on("wheel", (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, 0.5, 2.0);
      this.tweens.add({
        targets: this.cameras.main,
        zoom: newZoom,
        duration: 150,
        ease: "Power1",
      });
    });
  }

  panToAgent(key: string): void {
    const entry = this.agents.get(key);
    if (!entry) return;
    const { x, y } = isoToScreen(entry.agent.tileX, entry.agent.tileY);
    this.cameras.main.pan(x, y, 700, "Power2");
    this.tweens.add({
      targets: this.cameras.main, zoom: 1.4, duration: 700, ease: "Power2",
    });
  }

  panToRoom(key: RoomKey): void {
    const wp = ROOM_WAYPOINTS[key] ?? { tileX: 6, tileY: 6 };
    const { x, y } = isoToScreen(wp.tileX, wp.tileY);
    this.cameras.main.pan(x, y, 700, "Power2");
  }
}

// Suppress unused import warnings for ROOMS reused by other modules
void ROOMS;

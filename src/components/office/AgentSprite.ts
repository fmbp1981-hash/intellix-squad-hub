// AgentSprite.ts — visual + movement for one agent
import Phaser from "phaser";
import { isoToScreen, isoDepth, IsoPoint } from "./IsoUtils";
import type { AgentDef } from "./OfficeAssets";

export type AgentBehaviorState =
  | "idle" | "working" | "walking" | "meeting"
  | "coffee" | "bathroom" | "talking" | "checkpoint" | "done";

const SPEED = 2.4; // tiles per second

export class AgentSprite {
  public def: AgentDef;
  public tileX: number;
  public tileY: number;
  public state: AgentBehaviorState = "idle";
  public sprite: Phaser.GameObjects.Sprite;
  public label: Phaser.GameObjects.Container;
  public bubble?: Phaser.GameObjects.Container;
  public onClick?: (a: AgentSprite) => void;

  private scene: Phaser.Scene;
  private moveTarget: IsoPoint | null = null;
  private facing: "south" | "east" | "north" | "west" = "south";

  constructor(scene: Phaser.Scene, def: AgentDef, start: IsoPoint) {
    this.scene = scene;
    this.def = def;
    this.tileX = start.tileX;
    this.tileY = start.tileY;

    const { x, y } = isoToScreen(this.tileX, this.tileY);
    this.sprite = scene.add.sprite(x, y - 18, def.key, 0);
    this.sprite.setOrigin(0.5, 0.85);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on("pointerdown", (_p: unknown, _lx: unknown, _ly: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.onClick?.(this);
    });

    this.label = this.buildLabel(x, y);

    this.updateDepth();
    this.playIdle();
  }

  setState(s: AgentBehaviorState): void {
    if (this.state === s) return;
    this.state = s;
    if (s === "walking") {
      this.sprite.play(`${this.def.key}_walk_${this.facing}`, true);
      this.clearBubble();
    } else if (s === "working") {
      this.sprite.play(`${this.def.key}_working`, true);
      this.showBubble("working");
    } else if (s === "coffee") {
      this.playIdle();
      this.showBubble("coffee");
    } else if (s === "bathroom") {
      this.playIdle();
      this.clearBubble();
    } else if (s === "meeting" || s === "talking") {
      this.playIdle();
      this.showBubble("talking");
    } else if (s === "checkpoint") {
      this.playIdle();
      this.showBubble("checkpoint");
    } else if (s === "done") {
      this.playIdle();
      this.showBubble("done");
      this.scene.time.delayedCall(3000, () => {
        if (this.state === "done") this.setState("idle");
      });
    } else {
      this.playIdle();
      this.clearBubble();
    }
  }

  playIdle(): void {
    this.sprite.play(`${this.def.key}_idle`, true);
  }

  setMoveTarget(t: IsoPoint): void {
    this.moveTarget = t;
    this.setState("walking");
  }

  /** Returns true when arrived. */
  stepTowardTarget(deltaMs: number): boolean {
    if (!this.moveTarget) return true;
    const dt = deltaMs / 1000;
    const dx = this.moveTarget.tileX - this.tileX;
    const dy = this.moveTarget.tileY - this.tileY;
    const dist = Math.hypot(dx, dy);
    const move = SPEED * dt;
    if (dist <= move) {
      this.tileX = this.moveTarget.tileX;
      this.tileY = this.moveTarget.tileY;
      this.moveTarget = null;
      this.applyPosition();
      return true;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    this.tileX += nx * move;
    this.tileY += ny * move;
    const newFacing = Math.abs(nx) > Math.abs(ny)
      ? (nx > 0 ? "east" : "west")
      : (ny > 0 ? "south" : "north");
    if (newFacing !== this.facing) {
      this.facing = newFacing as typeof this.facing;
      this.sprite.play(`${this.def.key}_walk_${this.facing}`, true);
    }
    this.applyPosition();
    return false;
  }

  applyPosition(): void {
    const { x, y } = isoToScreen(this.tileX, this.tileY);
    this.sprite.x = x;
    this.sprite.y = y - 18;
    this.label.x = x;
    this.label.y = y + 6;
    if (this.bubble) {
      this.bubble.x = x;
      this.bubble.y = y - 56;
    }
    this.updateDepth();
  }

  updateDepth(): void {
    const d = isoDepth(this.tileX, this.tileY) + 5;
    this.sprite.setDepth(d);
    this.label.setDepth(d + 1);
    if (this.bubble) this.bubble.setDepth(d + 2);
  }

  showBubble(type: "talking" | "done" | "checkpoint" | "working" | "coffee"): void {
    this.clearBubble();
    const { x, y } = isoToScreen(this.tileX, this.tileY);
    const c = this.scene.add.container(x, y - 56);
    const bg = this.scene.add.graphics();
    const colors = {
      done: 0x22c55e, checkpoint: 0xfbbf24, working: 0x7c3aed, coffee: 0x92400e, talking: 0xffffff,
    } as const;
    bg.fillStyle(colors[type], 0.96);
    bg.fillRoundedRect(-14, -14, 28, 28, 6);
    bg.fillTriangle(-5, 12, 5, 12, 0, 18);

    const emojis = {
      done: "✅", checkpoint: "⚠️", working: "⚙️", coffee: "☕", talking: "💬",
    } as const;
    const txt = this.scene.add.text(0, -2, emojis[type], { fontSize: "13px" }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setDepth(isoDepth(this.tileX, this.tileY) + 7);
    this.bubble = c;

    if (type === "checkpoint") {
      this.scene.tweens.add({
        targets: c, scaleX: 1.18, scaleY: 1.18, duration: 600,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }
  }

  private buildLabel(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y + 16);
    const badgeText = this.def.badge ?? "";
    const badgeWidth = Math.max(28, badgeText.length * 5 + 10);
    const badgeColor = this.def.palette?.badgeColor ?? this.def.palette?.shirtBase ?? 0x7c3aed;
    const bg = this.scene.add.graphics();
    bg.fillStyle(badgeColor, 0.9);
    bg.fillRoundedRect(-badgeWidth / 2, -8, badgeWidth, 11, 3);
    const bt = this.scene.add.text(0, -3, badgeText, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffffff",
    }).setOrigin(0.5);
    const nt = this.scene.add.text(0, 9, this.def.name, {
      fontFamily: "Inter, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);
    c.add([bg, bt, nt]);
    return c;
  }

  clearBubble(): void {
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = undefined;
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
    this.clearBubble();
  }
}

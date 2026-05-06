import Phaser from "phaser";

export interface AgentSprite {
  id: string;
  name: string;
  role: string;
  squad: string;
  x: number;
  y: number;
}

const ROLE_COLORS: Record<string, number> = {
  ceo: 0xf59e0b,
  manager: 0x8b5cf6,
  analyst: 0x3b82f6,
  researcher: 0x10b981,
  writer: 0xec4899,
  reviewer: 0xef4444,
  default: 0x64748b,
};

export class OfficeScene extends Phaser.Scene {
  private agents: AgentSprite[] = [];
  private nodes = new Map<
    string,
    { circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text; pulse?: Phaser.Tweens.Tween }
  >();
  private tooltip!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("OfficeScene");
  }

  init(data: { agents: AgentSprite[] }) {
    this.agents = data.agents ?? [];
  }

  create() {
    const { width, height } = this.scale;

    const g = this.add.graphics();
    g.lineStyle(1, 0x1f2937, 0.6);
    for (let x = 0; x < width; x += 40) {
      g.moveTo(x, 0);
      g.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      g.moveTo(0, y);
      g.lineTo(width, y);
    }
    g.strokePath();

    this.add.rectangle(width / 2, 40, width - 40, 30, 0x1e293b, 0.6).setStrokeStyle(1, 0x334155);
    this.add.text(width / 2, 40, "OPENSQUAD HQ", { fontSize: "12px", color: "#94a3b8" }).setOrigin(0.5);

    this.tooltipBg = this.add
      .rectangle(0, 0, 10, 10, 0x0f172a, 0.95)
      .setStrokeStyle(1, 0x334155)
      .setVisible(false)
      .setDepth(100);
    this.tooltip = this.add
      .text(0, 0, "", { fontSize: "11px", color: "#e2e8f0", padding: { x: 6, y: 4 } })
      .setVisible(false)
      .setDepth(101);

    this.renderAgents();
  }

  setAgents(agents: AgentSprite[]) {
    this.agents = agents;
    if (this.scene.isActive()) this.renderAgents();
  }

  private renderAgents() {
    const { width, height } = this.scale;

    this.nodes.forEach((n) => {
      n.circle.destroy();
      n.label.destroy();
      n.pulse?.stop();
    });
    this.nodes.clear();

    if (this.agents.length === 0) {
      this.add
        .text(width / 2, height / 2, "Sem agentes configurados", {
          fontSize: "14px",
          color: "#64748b",
        })
        .setOrigin(0.5);
      return;
    }

    this.agents.forEach((a, i) => {
      const useFallback = a.x === 0 && a.y === 0;
      const cols = Math.ceil(Math.sqrt(this.agents.length));
      const cell = 120;
      const x = useFallback
        ? 80 + (i % cols) * cell
        : Phaser.Math.Clamp(a.x, 30, width - 30);
      const y = useFallback
        ? 100 + Math.floor(i / cols) * cell
        : Phaser.Math.Clamp(a.y, 80, height - 30);

      const color = ROLE_COLORS[a.role] ?? ROLE_COLORS.default;
      const circle = this.add
        .circle(x, y, 18, color)
        .setStrokeStyle(2, 0xffffff, 0.4)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, y + 28, a.name, { fontSize: "10px", color: "#e2e8f0" })
        .setOrigin(0.5);

      circle.on("pointerover", () => {
        this.tooltip.setText(`${a.name}\n${a.role} · ${a.squad}`);
        const b = this.tooltip.getBounds();
        this.tooltipBg
          .setPosition(x + b.width / 2 + 12, y - 30)
          .setSize(b.width + 8, b.height + 4)
          .setVisible(true);
        this.tooltip.setPosition(x + 12, y - 38).setVisible(true);
      });
      circle.on("pointerout", () => {
        this.tooltip.setVisible(false);
        this.tooltipBg.setVisible(false);
      });

      this.nodes.set(a.id, { circle, label });
    });
  }

  setActive(agentId: string, active: boolean) {
    const node = this.nodes.get(agentId);
    if (!node) return;
    if (active && !node.pulse) {
      node.pulse = this.tweens.add({
        targets: node.circle,
        scale: { from: 1, to: 1.5 },
        alpha: { from: 1, to: 0.6 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      node.circle.setStrokeStyle(3, 0x22d3ee, 1);
    } else if (!active && node.pulse) {
      node.pulse.stop();
      node.pulse = undefined;
      node.circle.setScale(1).setAlpha(1).setStrokeStyle(2, 0xffffff, 0.4);
    }
  }
}

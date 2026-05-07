// FurnitureFactory.ts — draws isometric furniture for each room
import Phaser from "phaser";
import { isoToScreen, isoDepth } from "./IsoUtils";

type Color = number;

const darken = (color: Color, amount: number): Color => {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    c.red * (1 - amount),
    c.green * (1 - amount),
    c.blue * (1 - amount),
  );
};

export class FurnitureFactory {
  constructor(private scene: Phaser.Scene) {}

  buildAll(): void {
    // GESTÃO
    this.desk(6, 8, 0xC8A96E);
    this.desk(7, 8, 0xC8A96E);
    this.chair(6, 9, 0x4a3a2a);
    this.chair(7, 9, 0x4a3a2a);
    this.monitor(6, 8);
    this.monitor(7, 8);
    this.plant(8, 7);
    this.bookshelf(5, 7);

    // REUNIÃO
    this.roundTable(6, 4);
    this.chair(5, 4, 0x37474F);
    this.chair(7, 4, 0x37474F);
    this.chair(6, 3, 0x37474F);
    this.chair(6, 5, 0x37474F);
    this.whiteboard(4, 3);

    // COMERCIAL
    this.desk(6, 1, 0xA88860);
    this.desk(8, 1, 0xA88860);
    this.desk(10, 1, 0xA88860);
    this.monitor(6, 1);
    this.monitor(8, 1);
    this.monitor(10, 1);
    this.chair(6, 2, 0x00897B);
    this.chair(8, 2, 0x00897B);
    this.chair(10, 2, 0x00897B);
    this.kanbanBoard(7, 0, 0x10b981);

    // MARKETING
    this.desk(9, 4, 0xA88860);
    this.desk(11, 4, 0xA88860);
    this.monitor(9, 4);
    this.monitor(11, 4);
    this.chair(9, 5, 0xE64A19);
    this.chair(11, 5, 0xE64A19);
    this.kanbanBoard(10, 3, 0xE64A19);
    this.plant(12, 6);

    // FINANCEIRO
    this.desk(10, 8, 0xA88860);
    this.desk(11, 9, 0xA88860);
    this.monitor(10, 8);
    this.monitor(11, 9);
    this.chair(10, 9, 0x0891B2);
    this.chair(11, 10, 0x0891B2);
    this.bookshelf(9, 7);
    this.filingCabinet(12, 7);

    // OPERAÇÕES
    this.desk(1, 8, 0xA88860);
    this.desk(3, 8, 0xA88860);
    this.monitor(1, 8);
    this.monitor(3, 8);
    this.chair(1, 9, 0xF57F17);
    this.chair(3, 9, 0xF57F17);
    this.kanbanBoard(2, 7, 0xF57F17);

    // DELIVERY (4 mesas — Ana, Bruno, Beatriz, Roberto)
    this.desk(1, 4, 0xA88860);
    this.desk(3, 4, 0xA88860);
    this.desk(1, 6, 0xA88860);
    this.desk(3, 6, 0xA88860);
    this.monitor(1, 4, 0x5b21b6);
    this.monitor(3, 4, 0x2563eb);
    this.monitor(1, 6, 0x7c3aed);
    this.monitor(3, 6, 0x059669);
    this.chair(1, 5, 0x5b21b6);
    this.chair(3, 5, 0x2563eb);
    this.chair(1, 7, 0x7c3aed);
    this.chair(3, 7, 0x059669);
    this.kanbanBoard(2, 3, 0x5b21b6);
    this.bookshelf(0, 6);
    this.plant(4, 6);

    // TI
    this.desk(6, 12, 0x2a2a3a);
    this.desk(7, 12, 0x2a2a3a);
    this.monitor(6, 12, 0x06b6d4);
    this.monitor(7, 12, 0x06b6d4);
    this.chair(6, 13, 0xDB2777);
    this.chair(7, 13, 0xDB2777);
    this.serverRack(8, 12);
    this.serverRack(8, 13);

    // COPA
    this.counter(0, 1);
    this.counter(1, 1);
    this.coffeeMachine(0, 1);
    this.fridge(2, 0);
    this.barTable(1, 2);

    // WC
    this.sink(3, 1);
    this.toilet(4, 2);
  }

  // ============ Generic isometric box ============

  private isoBox(
    tx: number, ty: number, w: number, h: number, z: number,
    top: Color, right: Color, left: Color,
  ): void {
    const gfx = this.scene.add.graphics();
    const { x, y } = isoToScreen(tx, ty);
    const halfW = 32 * w;
    const halfH = 16 * h;
    const V = (px: number, py: number) => new Phaser.Math.Vector2(px, py);
    // top
    gfx.fillStyle(top, 1);
    gfx.fillPoints([
      V(x,         y - halfH - z),
      V(x + halfW, y - z),
      V(x,         y + halfH - z),
      V(x - halfW, y - z),
    ], true);
    // right face
    gfx.fillStyle(right, 1);
    gfx.fillPoints([
      V(x + halfW, y - z),
      V(x + halfW, y),
      V(x,         y + halfH),
      V(x,         y + halfH - z),
    ], true);
    // left face
    gfx.fillStyle(left, 1);
    gfx.fillPoints([
      V(x,         y + halfH - z),
      V(x,         y + halfH),
      V(x - halfW, y),
      V(x - halfW, y - z),
    ], true);
    gfx.setDepth(isoDepth(tx, ty) + 1);
  }

  // ============ Furniture ============

  private desk(tx: number, ty: number, color: Color): void {
    this.isoBox(tx, ty, 0.85, 0.85, 14, color, darken(color, 0.4), darken(color, 0.22));
  }

  private chair(tx: number, ty: number, color: Color): void {
    this.isoBox(tx, ty, 0.4, 0.4, 8, color, darken(color, 0.4), darken(color, 0.22));
    const { x, y } = isoToScreen(tx, ty);
    const back = this.scene.add.graphics();
    back.fillStyle(darken(color, 0.18), 1);
    back.fillRect(x - 4, y - 22, 8, 14);
    back.setDepth(isoDepth(tx, ty) + 2);
  }

  private monitor(tx: number, ty: number, screen: Color = 0x1e293b): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x1a1a2e, 1);
    gfx.fillRect(x - 1, y - 18, 2, 6);
    gfx.fillStyle(0x0f172a, 1);
    gfx.fillRoundedRect(x - 10, y - 32, 20, 14, 1);
    gfx.fillStyle(screen, 1);
    gfx.fillRect(x - 8, y - 30, 16, 10);
    gfx.fillStyle(0xffffff, 0.08);
    gfx.fillRect(x - 8, y - 30, 16, 3);
    gfx.setDepth(isoDepth(tx, ty) + 3);
  }

  private plant(tx: number, ty: number): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x6b3a1f, 1);
    gfx.fillRect(x - 6, y - 4, 12, 8);
    gfx.fillStyle(0x166534, 1);
    gfx.fillCircle(x - 4, y - 12, 6);
    gfx.fillCircle(x + 4, y - 14, 6);
    gfx.fillCircle(x, y - 18, 7);
    gfx.fillStyle(0x22c55e, 1);
    gfx.fillCircle(x - 2, y - 16, 4);
    gfx.fillCircle(x + 3, y - 12, 4);
    gfx.setDepth(isoDepth(tx, ty) + 1);
  }

  private bookshelf(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.6, 0.4, 32, 0x6b4423, 0x3a2410, 0x4d2f15);
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    const colors = [0xef4444, 0x3b82f6, 0xeab308, 0x10b981, 0xa855f7];
    for (let i = 0; i < 5; i++) {
      gfx.fillStyle(colors[i % colors.length], 1);
      gfx.fillRect(x - 14 + i * 6, y - 28, 4, 10);
    }
    gfx.setDepth(isoDepth(tx, ty) + 2);
  }

  private filingCabinet(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.5, 0.5, 26, 0x94a3b8, 0x475569, 0x64748b);
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, 0x1e293b, 0.6);
    gfx.strokeRect(x - 8, y - 22, 16, 6);
    gfx.strokeRect(x - 8, y - 14, 16, 6);
    gfx.setDepth(isoDepth(tx, ty) + 2);
  }

  private roundTable(tx: number, ty: number): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(x, y + 6, 64, 32);
    gfx.fillStyle(0x4a3a2a, 1);
    gfx.fillEllipse(x, y - 8, 64, 32);
    gfx.fillStyle(0x6b4d2e, 1);
    gfx.fillEllipse(x, y - 12, 60, 28);
    gfx.setDepth(isoDepth(tx, ty) + 1);
  }

  private whiteboard(tx: number, ty: number): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xf8fafc, 1);
    gfx.fillRect(x - 16, y - 38, 32, 22);
    gfx.lineStyle(1, 0x94a3b8, 1);
    gfx.strokeRect(x - 16, y - 38, 32, 22);
    gfx.lineStyle(1.5, 0x3b82f6, 1);
    gfx.strokeLineShape(new Phaser.Geom.Line(x - 12, y - 32, x - 4, y - 32));
    gfx.lineStyle(1.5, 0xef4444, 1);
    gfx.strokeLineShape(new Phaser.Geom.Line(x - 12, y - 26, x + 8, y - 26));
    gfx.setDepth(isoDepth(tx, ty) + 1);
  }

  private kanbanBoard(tx: number, ty: number, accent: Color): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x1e293b, 1);
    gfx.fillRect(x - 18, y - 42, 36, 26);
    gfx.lineStyle(1, accent, 1);
    gfx.strokeRect(x - 18, y - 42, 36, 26);
    const cols = [0xfbbf24, 0xa855f7, 0x10b981];
    cols.forEach((c, i) => {
      gfx.fillStyle(c, 1);
      gfx.fillRect(x - 16 + i * 12, y - 38, 8, 4);
      gfx.fillRect(x - 16 + i * 12, y - 32, 8, 4);
      gfx.fillRect(x - 16 + i * 12, y - 26, 8, 4);
    });
    gfx.setDepth(isoDepth(tx, ty) + 1);
  }

  private sofa(tx: number, ty: number, color: Color): void {
    this.isoBox(tx, ty, 1.2, 0.6, 12, color, darken(color, 0.42), darken(color, 0.26));
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(darken(color, 0.18), 1);
    gfx.fillRect(x - 24, y - 24, 48, 14);
    gfx.setDepth(isoDepth(tx, ty) + 2);
  }

  private serverRack(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.5, 0.5, 40, 0x18181b, 0x09090b, 0x111114);
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    for (let i = 0; i < 4; i++) {
      gfx.fillStyle(0x10b981, Math.random() > 0.4 ? 1 : 0.3);
      gfx.fillRect(x - 6, y - 36 + i * 8, 2, 2);
      gfx.fillStyle(0xef4444, Math.random() > 0.7 ? 1 : 0.3);
      gfx.fillRect(x - 2, y - 36 + i * 8, 2, 2);
      gfx.fillStyle(0x06b6d4, 1);
      gfx.fillRect(x + 2, y - 36 + i * 8, 6, 2);
    }
    gfx.setDepth(isoDepth(tx, ty) + 3);
  }

  private counter(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.9, 0.6, 16, 0xe5e7eb, 0x6b7280, 0x9ca3af);
  }

  private coffeeMachine(tx: number, ty: number): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x1f2937, 1);
    gfx.fillRect(x - 6, y - 28, 12, 14);
    gfx.fillStyle(0x7c3aed, 1);
    gfx.fillRect(x - 4, y - 24, 8, 2);
    gfx.fillStyle(0x92400e, 1);
    gfx.fillCircle(x, y - 16, 3);
    gfx.setDepth(isoDepth(tx, ty) + 3);
  }

  private fridge(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.6, 0.6, 36, 0xf8fafc, 0xa1a1aa, 0xd4d4d8);
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, 0x71717a, 1);
    gfx.strokeLineShape(new Phaser.Geom.Line(x - 8, y - 22, x + 8, y - 22));
    gfx.fillStyle(0x71717a, 1);
    gfx.fillCircle(x + 6, y - 26, 1.5);
    gfx.setDepth(isoDepth(tx, ty) + 3);
  }

  private barTable(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.5, 0.5, 22, 0x6b4423, 0x3a2410, 0x4d2f15);
  }

  private sink(tx: number, ty: number): void {
    this.isoBox(tx, ty, 0.7, 0.5, 12, 0xe2e8f0, 0x64748b, 0x94a3b8);
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x60a5fa, 0.4);
    gfx.fillEllipse(x, y - 6, 18, 6);
    gfx.setDepth(isoDepth(tx, ty) + 2);
  }

  private toilet(tx: number, ty: number): void {
    const { x, y } = isoToScreen(tx, ty);
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xf8fafc, 1);
    gfx.fillEllipse(x, y - 4, 14, 10);
    gfx.fillStyle(0xe2e8f0, 1);
    gfx.fillRect(x - 6, y - 18, 12, 12);
    gfx.setDepth(isoDepth(tx, ty) + 2);
  }
}

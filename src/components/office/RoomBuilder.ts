// RoomBuilder.ts — paints isometric floor + walls + room label
import Phaser from "phaser";
import { isoToScreen, isoDepth, TILE_W, TILE_H, ROOMS, RoomKey, RoomDef } from "./IsoUtils";

function tileDiamond(gfx: Phaser.GameObjects.Graphics, tx: number, ty: number) {
  const { x, y } = isoToScreen(tx, ty);
  gfx.beginPath();
  gfx.moveTo(x, y - TILE_H / 2);
  gfx.lineTo(x + TILE_W / 2, y);
  gfx.lineTo(x, y + TILE_H / 2);
  gfx.lineTo(x - TILE_W / 2, y);
  gfx.closePath();
  gfx.fillPath();
}

export class RoomBuilder {
  constructor(private scene: Phaser.Scene) {}

  buildAll(): void {
    (Object.entries(ROOMS) as [RoomKey, RoomDef][]).forEach(([_key, room]) => {
      this.buildFloor(room);
      this.buildWalls(room);
      this.buildLabel(room);
    });
  }

  private buildFloor(room: RoomDef): void {
    const gfx = this.scene.add.graphics();
    const c = Phaser.Display.Color.IntegerToColor(room.color);
    const tint1 = Phaser.Display.Color.GetColor(c.red * 0.18, c.green * 0.18, c.blue * 0.18);
    const tint2 = Phaser.Display.Color.GetColor(c.red * 0.24, c.green * 0.24, c.blue * 0.24);

    for (let dx = 0; dx < room.w; dx++) {
      for (let dy = 0; dy < room.h; dy++) {
        const tx = room.x + dx;
        const ty = room.y + dy;
        gfx.fillStyle((dx + dy) % 2 === 0 ? tint1 : tint2, 1);
        tileDiamond(gfx, tx, ty);
      }
    }
    gfx.setDepth(0);

    // Soft room "light"
    const light = this.scene.add.graphics();
    light.fillStyle(room.color, 0.05);
    const cx = room.x + room.w / 2 - 0.5;
    const cy = room.y + room.h / 2 - 0.5;
    const { x, y } = isoToScreen(cx, cy);
    light.fillCircle(x, y, Math.max(room.w, room.h) * TILE_W * 0.55);
    light.setDepth(1);
  }

  private buildWalls(room: RoomDef): void {
    const wallColor = Phaser.Display.Color.IntegerToColor(room.color);
    const wallFill = Phaser.Display.Color.GetColor(wallColor.red * 0.55, wallColor.green * 0.55, wallColor.blue * 0.55);
    const wallSide = Phaser.Display.Color.GetColor(wallColor.red * 0.32, wallColor.green * 0.32, wallColor.blue * 0.32);
    const wallH = 38;

    const gfx = this.scene.add.graphics();
    // North wall (along y = room.y)
    for (let dx = 0; dx < room.w; dx++) {
      const tx = room.x + dx;
      const ty = room.y;
      const { x, y } = isoToScreen(tx, ty);
      gfx.fillStyle(wallFill, 1);
      gfx.fillPoints([
        { x,                y: y - TILE_H / 2 },
        { x: x + TILE_W / 2, y: y },
        { x: x + TILE_W / 2, y: y - wallH },
        { x,                y: y - TILE_H / 2 - wallH },
      ], true);
      gfx.lineStyle(1, room.color, 0.45);
      gfx.strokePoints([
        { x,                y: y - TILE_H / 2 - wallH },
        { x: x + TILE_W / 2, y: y - wallH },
      ]);
    }

    // West wall (along x = room.x)
    for (let dy = 0; dy < room.h; dy++) {
      const tx = room.x;
      const ty = room.y + dy;
      const { x, y } = isoToScreen(tx, ty);
      gfx.fillStyle(wallSide, 1);
      gfx.fillPoints([
        { x,                y: y - TILE_H / 2 },
        { x: x - TILE_W / 2, y: y },
        { x: x - TILE_W / 2, y: y - wallH },
        { x,                y: y - TILE_H / 2 - wallH },
      ], true);
      gfx.lineStyle(1, room.color, 0.45);
      gfx.strokePoints([
        { x,                y: y - TILE_H / 2 - wallH },
        { x: x - TILE_W / 2, y: y - wallH },
      ]);
    }
    gfx.setDepth(isoDepth(room.x, room.y) - 1);
  }

  private buildLabel(room: RoomDef): void {
    const cx = room.x + room.w / 2 - 0.5;
    const ty = room.y;
    const { x, y } = isoToScreen(cx, ty);
    const labelY = y - 56;

    const container = this.scene.add.container(x, labelY);
    const text = `${room.emoji}  ${room.label}`;
    const txtObj = this.scene.add.text(0, 0, text, {
      fontFamily: "Inter, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);
    const padX = 10, padY = 4;
    const w = txtObj.width + padX * 2;
    const h = txtObj.height + padY * 2;
    const bg = this.scene.add.graphics();
    bg.fillStyle(room.color, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1, 0xffffff, 0.2);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    container.add([bg, txtObj]);
    container.setDepth(9999);
  }
}

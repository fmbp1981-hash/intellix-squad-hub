import { useEffect, useRef } from 'react';
import type { SquadState } from '@/types';
import { useOfficeChoreography } from './useOfficeChoreography';
import { CELL_2D, GRID_COLS, GRID_ROWS, ROOMS, STATUS_COLOR } from './officeLayout';

interface Props {
  squadState: SquadState | null;
  width?: number;
  height?: number;
}

const W = GRID_COLS * CELL_2D;
const H = GRID_ROWS * CELL_2D;

export default function OfficeViewer2D({ squadState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const sceneRef = useRef<{
    upsertAgents: (poses: ReturnType<typeof useOfficeChoreography>['poses']) => void;
  } | null>(null);

  const choreo = useOfficeChoreography(squadState);

  useEffect(() => {
    let destroyed = false;
    let game: { destroy: (b: boolean) => void } | null = null;

    (async () => {
      const Phaser = (await import('phaser')).default;
      if (destroyed || !containerRef.current) return;

      class OfficeScene extends Phaser.Scene {
        agents = new Map<string, Phaser.GameObjects.Container>();

        create() {
          // floor
          this.add.rectangle(W / 2, H / 2, W, H, 0x0b1220);
          // grid
          const g = this.add.graphics({ lineStyle: { width: 1, color: 0x111827, alpha: 0.6 } });
          for (let c = 0; c <= GRID_COLS; c += 1) {
            g.lineBetween(c * CELL_2D, 0, c * CELL_2D, H);
          }
          for (let r = 0; r <= GRID_ROWS; r += 1) {
            g.lineBetween(0, r * CELL_2D, W, r * CELL_2D);
          }

          // rooms
          ROOMS.forEach((room) => {
            const [cs, rs, ce, re] = room.rect;
            const x = cs * CELL_2D;
            const y = rs * CELL_2D;
            const w = (ce - cs + 1) * CELL_2D;
            const h = (re - rs + 1) * CELL_2D;
            const color = Phaser.Display.Color.HexStringToColor(room.color).color;
            this.add.rectangle(x + w / 2, y + h / 2, w - 4, h - 4, color, 0.18).setStrokeStyle(2, color, 0.85);
            // pill label
            const label = this.add.text(x + 8, y + 8, room.label, {
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              color: '#f8fafc',
              backgroundColor: room.color,
              padding: { left: 6, right: 6, top: 2, bottom: 2 },
            });
            label.setAlpha(0.95);

            // desks for departmental rooms
            if (room.isDept && room.desks > 0) {
              for (let i = 0; i < room.desks; i += 1) {
                const cols = Math.min(2, ce - cs - 1);
                const c = i % cols;
                const r = Math.floor(i / cols);
                const dx = (cs + 1 + c * Math.max(1, ce - cs - 2)) * CELL_2D + CELL_2D / 2;
                const dy = (rs + 1 + r * Math.max(1, re - rs - 2)) * CELL_2D + CELL_2D / 2;
                this.add.rectangle(dx, dy + 14, 28, 14, 0x1f2937).setStrokeStyle(1, 0x334155);
              }
            }
          });

          // Drive door
          this.add.rectangle(W - 8, (6 + 0.5) * CELL_2D, 12, CELL_2D - 6, 0xfbbf24);
          this.add.text(W - 30, 6 * CELL_2D - 14, 'DRIVE', {
            fontSize: '9px',
            color: '#fbbf24',
            fontFamily: 'monospace',
          });

          sceneRef.current = {
            upsertAgents: (poses) => {
              const seen = new Set<string>();
              poses.forEach((p) => {
                seen.add(p.id);
                let c = this.agents.get(p.id);
                const x = p.col * CELL_2D + CELL_2D / 2;
                const y = p.row * CELL_2D + CELL_2D / 2;
                const color = Phaser.Display.Color.HexStringToColor(STATUS_COLOR[p.status] ?? '#64748b').color;
                if (!c) {
                  c = this.add.container(x, y);
                  const body = this.add.circle(0, 0, 12, color).setStrokeStyle(2, 0xffffff, 0.9);
                  body.name = 'body';
                  const icon = this.add.text(0, 0, p.icon, { fontSize: '14px' }).setOrigin(0.5);
                  icon.name = 'icon';
                  const bubble = this.add
                    .text(0, -26, '', {
                      fontSize: '9px',
                      color: '#0f172a',
                      backgroundColor: '#fef3c7',
                      padding: { left: 4, right: 4, top: 2, bottom: 2 },
                    })
                    .setOrigin(0.5)
                    .setVisible(false);
                  bubble.name = 'bubble';
                  const carry = this.add.text(10, -10, '', { fontSize: '12px' });
                  carry.name = 'carry';
                  c.add([body, icon, bubble, carry]);
                  this.agents.set(p.id, c);
                  // pulse if working
                  this.tweens.add({
                    targets: body,
                    scale: { from: 1, to: 1.15 },
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                  });
                }
                c.x = x;
                c.y = y - (p.motion > 0.05 ? Math.abs(Math.sin(performance.now() / 120)) * 2 : 0);
                const body = c.getByName('body') as Phaser.GameObjects.Arc;
                body.setFillStyle(color);
                const carry = c.getByName('carry') as Phaser.GameObjects.Text;
                carry.setText(p.carrying === 'folder' ? '📁' : p.carrying === 'document' ? '📄' : '');
                const bubble = c.getByName('bubble') as Phaser.GameObjects.Text;
                if (p.bubble) {
                  bubble.setText(p.bubble.length > 26 ? `${p.bubble.slice(0, 26)}…` : p.bubble);
                  bubble.setVisible(true);
                } else {
                  bubble.setVisible(false);
                }
              });
              // remove vanished
              for (const [id, c] of this.agents) {
                if (!seen.has(id)) {
                  c.destroy();
                  this.agents.delete(id);
                }
              }
            },
          };
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: W,
        height: H,
        backgroundColor: '#020617',
        scene: OfficeScene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
      gameRef.current = game;
    })();

    return () => {
      destroyed = true;
      if (game) game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // push poses on every render
  useEffect(() => {
    sceneRef.current?.upsertAgents(choreo.poses);
  }, [choreo.poses]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ aspectRatio: `${W} / ${H}`, background: '#020617' }}
    />
  );
}

// OfficeViewer2D.tsx — Pixel-art top-down office viewer (Phaser 3)
import { useEffect, useRef } from "react";
import type { SquadState } from "@/types";

export interface AgentExternalState {
  agentKey: string;
  status?: string;
  currentJob?: string;
}

interface Props {
  squadState: SquadState | null;
  agentExternalStates?: AgentExternalState[];
}

export default function OfficeViewer2D({ agentExternalStates }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const { OfficePixelScene2D } = await import("./OfficePixelScene2D");
      if (cancelled || !containerRef.current || gameRef.current) return;

      const scene = new OfficePixelScene2D();
      const game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: 896,
        height: 640,
        parent: containerRef.current,
        backgroundColor: "#0a0a0f",
        scene: [scene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          antialias: false,
          pixelArt: true,
          roundPixels: true,
        },
      });
      gameRef.current = game;
      sceneRef.current = scene;
    })();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push agent states into scene registry without re-creating the game
  useEffect(() => {
    if (!sceneRef.current) return;
    const map: Record<string, AgentExternalState> = {};
    agentExternalStates?.forEach((s) => { map[s.agentKey] = s; });
    sceneRef.current.registry?.set("agentStates2D", map);
  }, [agentExternalStates]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border bg-[#0a0a0f]"
      style={{ aspectRatio: "896/640", position: "relative" }}
    />
  );
}

import { useEffect, useRef } from "react";

export interface AgentExternalState {
  agentKey: string;
  status?: "idle" | "working" | "walking" | "done" | "checkpoint" | "coffee" | "bathroom" | "meeting";
  currentJob?: string;
}

export interface SquadRunInfo {
  id: string;
  name: string;
  color?: number;
}

interface Props {
  agentStates?: AgentExternalState[];
  squadRun?: SquadRunInfo | null;
  onAgentClick?: (agentKey: string) => void;
  height?: number;
}

export function IntelliXOfficeViewer({ agentStates, squadRun, onAgentClick, height = 700 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<any>(null);
  const onAgentClickRef = useRef(onAgentClick);
  onAgentClickRef.current = onAgentClick;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const { IntelliXOfficeScene } = await import("./IntelliXOfficeScene");
      if (cancelled || !containerRef.current || gameRef.current) return;

      const scene = new IntelliXOfficeScene();
      scene.setClickHandler((key) => onAgentClickRef.current?.(key));

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#0D1B2A",
        scene: [scene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.NO_CENTER,
        },
        render: { antialias: true, pixelArt: false },
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

  // Push agent states into the scene registry without re-creating the game
  useEffect(() => {
    if (!sceneRef.current || !agentStates) return;
    const map: Record<string, { status?: string; currentJob?: string }> = {};
    agentStates.forEach((s) => { map[s.agentKey] = { status: s.status, currentJob: s.currentJob }; });
    sceneRef.current.registry?.set("agentStates", map);
  }, [agentStates]);

  // Push squad run info
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.registry?.set("squadRun", squadRun ?? null);
  }, [squadRun]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-border bg-[#0D1B2A] shadow-card"
      style={{ height, position: "relative" }}
    />
  );
}

export default IntelliXOfficeViewer;

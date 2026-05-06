import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { OfficeScene, type AgentSprite } from "@/game/office/OfficeScene";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function OfficePage() {
  const { isAdmin, loading } = useIsAdmin();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const [agents, setAgents] = useState<AgentSprite[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("agent_configs")
        .select("id, name, role, position_x, position_y, squad_configs(name)")
        .eq("active", true);
      const mapped: AgentSprite[] = (data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        squad: a.squad_configs?.name ?? "—",
        x: a.position_x ?? 0,
        y: a.position_y ?? 0,
      }));
      setAgents(mapped);
    })();
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    const scene = new OfficeScene();
    sceneRef.current = scene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: 600,
      backgroundColor: "#0b1120",
      scene,
      scale: { mode: Phaser.Scale.RESIZE },
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setAgents(agents);
  }, [agents]);

  useEffect(() => {
    const channel = supabase
      .channel("office-runs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "run_steps" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row?.agent_id) return;
          sceneRef.current?.setActive(row.agent_id, row.status === "processing");
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/workspaces" replace />;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Escritório Virtual</h1>
        <p className="text-sm text-muted-foreground">
          Visualização em tempo real dos agentes ativos.
        </p>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-border bg-card"
        style={{ height: 600 }}
      />
    </div>
  );
}

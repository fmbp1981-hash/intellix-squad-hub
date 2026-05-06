import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Navigate } from "react-router-dom";
import { Loader2, LayoutGrid, Box } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { OfficeScene, type AgentSprite, type OfficeMode } from "@/game/office/OfficeScene";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OfficePage() {
  const { isAdmin, loading } = useIsAdmin();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const [agents, setAgents] = useState<AgentSprite[]>([]);
  const [mode, setMode] = useState<OfficeMode>("2d");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("agent_configs")
        .select("id, name, role, squad_configs(name)")
        .eq("active", true);
      const mapped: AgentSprite[] = (data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        squad: a.squad_configs?.name ?? "—",
      }));
      setAgents(mapped);
    })();
  }, []);

  // Build / rebuild Phaser game when mode changes
  useEffect(() => {
    if (loading || !isAdmin) return;
    if (!containerRef.current) return;
    const scene = new OfficeScene();
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1100,
      height: 640,
      backgroundColor: "#0a0a0f",
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        postBoot: () => {
          scene.scene.start("OfficeScene", { mode, agents });
        },
      },
    });
    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [loading, isAdmin, mode]);

  // Push agent updates to scene
  useEffect(() => {
    sceneRef.current?.setAgents(agents);
  }, [agents]);

  // Realtime activity
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
        },
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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              IntelliX.AI
            </span>{" "}
            · Escritório Virtual
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualização em tempo real dos agentes ativos por departamento.
          </p>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as OfficeMode)}>
          <TabsList>
            <TabsTrigger value="2d" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> 2D
            </TabsTrigger>
            <TabsTrigger value="iso" className="gap-1.5">
              <Box className="h-4 w-4" /> 3D
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
        style={{ height: 640 }}
      />
    </div>
  );
}

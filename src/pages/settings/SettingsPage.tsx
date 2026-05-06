import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WhatsAppSettings from "./WhatsAppSettings";
import ModelSettings from "./ModelSettings";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab = raw === "models" || raw === "notifications" ? raw : "whatsapp";

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie integrações, modelos e notificações da plataforma.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="models">Modelos LLM</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppSettings />
        </TabsContent>
        <TabsContent value="models" className="mt-4">
          <ModelSettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}

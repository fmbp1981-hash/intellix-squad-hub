import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Database, MessageSquare, User } from "lucide-react";
import AgentsSettings from "@/pages/settings/AgentsSettings";
import WhatsAppSettings from "@/pages/settings/WhatsAppSettings";
import ModelSettings from "@/pages/settings/ModelSettings";
import ProfileSettings from "@/pages/settings/ProfileSettings";
import { KnowledgeBaseTab } from "@/pages/config/KnowledgeBaseTab";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function ConfigPage() {
  const { isAdmin } = useIsAdmin();

  return (
    <Tabs defaultValue="agents" className="flex h-full flex-col">
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="base" className="gap-2">
              <Database className="h-4 w-4" />
              Base de Conhecimento
            </TabsTrigger>
          )}
        </TabsList>
      </div>
      <TabsContent value="agents" className="flex-1 overflow-auto mt-0">
        <div className="p-6">
          <AgentsSettings />
        </div>
      </TabsContent>
      <TabsContent value="channels" className="flex-1 overflow-auto mt-0">
        <Tabs defaultValue="whatsapp" className="p-6">
          <TabsList className="mb-4">
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="models">Modelos IA</TabsTrigger>
          </TabsList>
          <TabsContent value="whatsapp">
            <WhatsAppSettings />
          </TabsContent>
          <TabsContent value="models">
            <ModelSettings />
          </TabsContent>
        </Tabs>
      </TabsContent>
      <TabsContent value="profile" className="flex-1 overflow-auto mt-0">
        <div className="p-6">
          <ProfileSettings />
        </div>
      </TabsContent>
      {isAdmin && (
        <TabsContent value="base" className="flex-1 overflow-auto mt-0">
          <div className="p-6">
            <KnowledgeBaseTab />
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

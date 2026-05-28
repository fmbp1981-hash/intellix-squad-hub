import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, Rocket, Target } from "lucide-react";
import LeadList from "@/pages/crm/LeadList";
import DealKanban from "@/pages/crm/DealKanban";
import ProjectsList from "@/pages/projects/ProjectsList";
import { OutreachLeadsTab } from "./OutreachLeadsTab";

export default function PipelinePage() {
  return (
    <Tabs defaultValue="leads" className="flex h-full flex-col">
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="deals" className="gap-2">
            <Kanban className="h-4 w-4" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-2">
            <Rocket className="h-4 w-4" />
            Projetos
          </TabsTrigger>
          <TabsTrigger value="outreach" className="gap-2">
            <Target className="h-4 w-4" />
            Leads SDR
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="leads" className="flex-1 overflow-auto mt-0">
        <LeadList />
      </TabsContent>
      <TabsContent value="deals" className="flex-1 overflow-auto mt-0">
        <DealKanban />
      </TabsContent>
      <TabsContent value="projetos" className="flex-1 overflow-auto mt-0">
        <ProjectsList />
      </TabsContent>
      <TabsContent value="outreach" className="flex-1 overflow-auto mt-0">
        <OutreachLeadsTab />
      </TabsContent>
    </Tabs>
  );
}

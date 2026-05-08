import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Sparkles } from "lucide-react";
import OfficePage from "@/pages/office/OfficePage";
import OfficeGestao from "@/pages/office/OfficeGestao";

export default function EscritorioPage() {
  return (
    <Tabs defaultValue="office" className="flex h-full flex-col">
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="office" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Escritório
          </TabsTrigger>
          <TabsTrigger value="agata" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Ágata
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="office" className="flex-1 overflow-auto mt-0">
        <OfficePage />
      </TabsContent>
      <TabsContent value="agata" className="flex-1 overflow-auto mt-0">
        <OfficeGestao />
      </TabsContent>
    </Tabs>
  );
}

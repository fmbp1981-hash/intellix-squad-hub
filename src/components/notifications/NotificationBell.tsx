import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  category: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("channel", "app")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) setItems((data ?? []) as Notification[]);
    }
    load();

    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }
  async function markAll() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <header className="flex items-center justify-between border-b border-border p-3">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAll}>
              <CheckCheck className="mr-1 h-3 w-3" /> Marcar todas
            </Button>
          )}
        </header>
        <ScrollArea className="h-96">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem notificações.</p>
          ) : (
            <ul>
              {items.map((n) => {
                const isUnread = !n.read_at;
                const Tag = n.link ? "a" : "div";
                return (
                  <li key={n.id} className={cn("border-b border-border last:border-0")}>
                    <Tag
                      {...(n.link ? { href: n.link } : {})}
                      className={cn(
                        "block px-3 py-2.5 hover:bg-muted/50 cursor-pointer",
                        isUnread && "bg-primary/5",
                      )}
                      onClick={() => isUnread && markRead(n.id)}
                    >
                      <div className="flex items-start gap-2">
                        {isUnread && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            {n.priority === "high" && (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1">!</Badge>
                            )}
                          </div>
                          {n.body && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                          )}
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                            {n.category && ` · ${n.category}`}
                          </p>
                        </div>
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              markRead(n.id);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Marcar como lida"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </Tag>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

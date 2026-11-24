import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Megaphone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markNotificationsRead, notificationsQuery, liveAnnouncementsQuery } from "@/lib/extras.functions";
import { cn } from "@/lib/utils";

const SEEN_KEY = "examhub-seen-announcements";

export function NotificationBell() {
  const qc = useQueryClient();
  const markRead = useServerFn(markNotificationsRead);
  const { data: items = [] } = useQuery(notificationsQuery);
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => { setSeen(localStorage.getItem(SEEN_KEY)); }, []);
  const { data: anns = [] } = useQuery(liveAnnouncementsQuery);
  const seenSet = new Set((seen ?? "").split(",").filter(Boolean));
  const unread = items.filter(n => !n.read_at).length + anns.filter(a => !seenSet.has(`${a.id}:${a.updated_at}`)).length;

  async function onOpen(open: boolean) {
    if (!open) return;
    if (anns.length) { const v = anns.map(a => `${a.id}:${a.updated_at}`).join(","); localStorage.setItem(SEEN_KEY, v); setSeen(v); }
    if (items.some(n => !n.read_at)) { await markRead(); void qc.invalidateQueries({ queryKey: ["notifications"] }); }
  }

  return (
    <Popover onOpenChange={o => void onOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className="relative">
          <Bell />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-semibold">Notifications</p>{unread > 0 && <span className="text-xs text-muted-foreground">{unread} new</span>}</div>
        <ScrollArea className="max-h-96">
          {anns.map(a => <div key={a.id} className="flex gap-3 border-b bg-accent/40 px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Megaphone className="size-4" /></span>
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Announcement</p><p className="text-sm font-medium">{a.title}</p>{a.body && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">{a.body}</p>}{a.expires_at && <p className="mt-1 text-xs text-muted-foreground">Until {new Date(a.expires_at).toLocaleString()}</p>}</div>
          </div>)}
          {items.map(n => <div key={n.id} className={cn("flex gap-3 border-b px-4 py-3 last:border-0", !n.read_at && "bg-muted/50")}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-destructive"><ShieldAlert className="size-4" /></span>
            <div className="min-w-0"><p className="text-sm font-medium">{n.title}</p><p className="mt-0.5 break-words text-sm text-muted-foreground">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></div>
          </div>)}
          {!anns.length && !items.length && <p className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

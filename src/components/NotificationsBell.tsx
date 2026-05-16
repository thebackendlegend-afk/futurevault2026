import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, Unlock, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type N = {
  id: string;
  type: "like" | "comment" | "unlock";
  capsule_id: string;
  message: string | null;
  read: boolean;
  created_at: string;
};

const ICONS = {
  like: <Heart className="size-4 text-rose-400" />,
  comment: <MessageCircle className="size-4 text-primary" />,
  unlock: <Unlock className="size-4 text-emerald-400" />,
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    // Backfill unlock notifications for the user's own capsules that have unlocked
    const { data: unlocked } = await supabase
      .from("capsules")
      .select("id, title")
      .eq("user_id", user.id)
      .lte("unlock_time", new Date().toISOString());
    if (unlocked?.length) {
      const rows = unlocked.map((c: any) => ({
        user_id: user.id,
        type: "unlock",
        capsule_id: c.id,
        message: `"${c.title}" has unlocked`,
      }));
      // upsert with the partial unique index would require onConflict cols; use plain insert ignoring duplicates
      await (supabase.from("notifications") as any)
        .upsert(rows, { onConflict: "user_id,capsule_id", ignoreDuplicates: true });
    }
    const { data } = await (supabase.from("notifications") as any)
      .select("*").order("created_at", { ascending: false }).limit(30);
    setItems((data as N[]) ?? []);
  };

  useEffect(() => {
    if (!user) { setItems([]); return; }
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => setItems((arr) => [p.new as N, ...arr]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!unread) return;
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    await (supabase.from("notifications") as any).update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative size-9 grid place-items-center rounded-md hover:bg-accent transition"
        aria-label="Notifications"
      >
        <Bell className="size-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 size-4 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground grid place-items-center glow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 glass-strong rounded-xl border border-border shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-border/40">
              <span className="font-display font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
                  <Check className="size-3.5 mr-1" /> Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">You're all caught up.</p>
              ) : (
                <ul>
                  {items.map((n) => (
                    <li key={n.id}>
                      <Link
                        to="/capsule/$id"
                        params={{ id: n.capsule_id }}
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 px-3 py-3 hover:bg-accent/40 transition border-b border-border/20 ${!n.read ? "bg-primary/5" : ""}`}
                      >
                        <div className="size-8 rounded-full glass grid place-items-center shrink-0">
                          {ICONS[n.type]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug truncate">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!n.read && <span className="size-2 rounded-full bg-primary self-center shrink-0" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

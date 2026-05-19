import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { motion } from "framer-motion";
import { Search, Send, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  with: fallback(z.string().optional(), undefined).default(undefined as any),
});

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: zodValidator(searchSchema),
  component: Messages,
});

type Profile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
type DM = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null };

function Avatar({ p, size = 40 }: { p?: Profile | null; size?: number }) {
  const initials = ((p?.full_name || p?.username || "?").split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join("")) || "?";
  return (
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold shrink-0">
      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: size / 2.5 }}>{initials}</span>}
    </div>
  );
}

function Messages() {
  const { user } = useAuth();
  const { with: withId } = Route.useSearch();
  const nav = useNavigate({ from: "/messages" });

  const [conversations, setConversations] = useState<{ profile: Profile; last: DM; unread: number }[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [active, setActive] = useState<Profile | null>(null);
  const [thread, setThread] = useState<DM[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive || !msgs) return;
      const byPeer = new Map<string, { last: DM; unread: number }>();
      for (const m of msgs as DM[]) {
        const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        const entry = byPeer.get(peer) ?? { last: m, unread: 0 };
        if (m.recipient_id === user.id && !m.read_at) entry.unread += 1;
        byPeer.set(peer, entry);
      }
      const ids = [...byPeer.keys()];
      if (!ids.length) return setConversations([]);
      const { data: profs } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
      const list = (profs ?? []).map(p => ({ profile: p as Profile, ...byPeer.get(p.id)! }))
        .sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
      setConversations(list);
    })();
    return () => { alive = false; };
  }, [user, thread.length]);

  // Realtime new incoming
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("dm-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${user.id}` }, (payload) => {
        const m = payload.new as DM;
        if (active && m.sender_id === active.id) setThread(t => [...t, m]);
        setConversations(prev => {
          const next = [...prev];
          const idx = next.findIndex(c => c.profile.id === m.sender_id);
          if (idx >= 0) { next[idx] = { ...next[idx], last: m, unread: active?.id === m.sender_id ? 0 : next[idx].unread + 1 }; }
          return next.sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, active]);

  // Open conversation when ?with= changes
  useEffect(() => {
    if (!withId || !user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", withId).maybeSingle();
      if (data) setActive(data as Profile);
    })();
  }, [withId, user]);

  // Load thread + mark read
  useEffect(() => {
    if (!active || !user) { setThread([]); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!alive) return;
      setThread((data as DM[]) ?? []);
      await supabase.from("direct_messages").update({ read_at: new Date().toISOString() })
        .eq("sender_id", active.id).eq("recipient_id", user.id).is("read_at", null);
      setConversations(prev => prev.map(c => c.profile.id === active.id ? { ...c, unread: 0 } : c));
    })();
    return () => { alive = false; };
  }, [active, user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [thread.length]);

  // Username search
  useEffect(() => {
    const q = search.trim();
    if (!q || !user) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq("id", user.id)
        .limit(10);
      setSearchResults((data ?? []) as Profile[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search, user]);

  const send = async () => {
    const text = input.trim();
    if (!text || !active || !user || sending) return;
    setSending(true);
    const optimistic: DM = { id: crypto.randomUUID(), sender_id: user.id, recipient_id: active.id, content: text, created_at: new Date().toISOString(), read_at: null };
    setThread(t => [...t, optimistic]);
    setInput("");
    const { error, data } = await supabase.from("direct_messages").insert({ sender_id: user.id, recipient_id: active.id, content: text }).select().single();
    setSending(false);
    if (error) { toast.error(error.message); setThread(t => t.filter(m => m.id !== optimistic.id)); return; }
    setThread(t => t.map(m => m.id === optimistic.id ? (data as DM) : m));
  };

  const openWith = (p: Profile) => { nav({ search: { with: p.id } }); setActive(p); setSearch(""); setSearchResults([]); };

  const showList = !active;

  return (
    <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-6 max-w-5xl">
      <div className="sm:glass-strong sm:rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[calc(100vh-4rem)] sm:min-h-[70vh]">
        {/* Sidebar */}
        <aside className={`${showList ? "block" : "hidden md:block"} border-r border-border`}>
          <div className="p-4 border-b border-border">
            <h1 className="font-display font-bold text-xl mb-3 flex items-center gap-2"><MessageCircle className="size-5" /> Messages</h1>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search @username" className="pl-9" />
            </div>
          </div>
          <div className="overflow-y-auto">
            {search.trim() ? (
              searchResults.length ? searchResults.map(p => (
                <button key={p.id} onClick={() => openWith(p)} className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3">
                  <Avatar p={p} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.full_name || p.username || "User"}</div>
                    <div className="text-xs text-muted-foreground truncate">@{p.username ?? "—"}</div>
                  </div>
                </button>
              )) : <div className="px-4 py-6 text-sm text-muted-foreground">No users found</div>
            ) : conversations.length ? conversations.map(c => (
              <button key={c.profile.id} onClick={() => openWith(c.profile)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 ${active?.id === c.profile.id ? "bg-muted/40" : ""}`}>
                <Avatar p={c.profile} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{c.profile.full_name || c.profile.username || "User"}</div>
                    {c.unread > 0 && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{c.unread}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.last.sender_id === user?.id ? "You: " : ""}{c.last.content}</div>
                </div>
              </button>
            )) : <div className="px-4 py-10 text-sm text-muted-foreground text-center">No conversations yet.<br/>Search a username to start.</div>}
          </div>
        </aside>

        {/* Thread */}
        <section className={`${showList ? "hidden md:flex" : "flex"} flex-col`}>
          {active ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button size="sm" variant="ghost" className="md:hidden" onClick={() => { setActive(null); nav({ search: {} as any }); }}>
                  <ArrowLeft className="size-4" />
                </Button>
                <Avatar p={active} size={36} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{active.full_name || active.username || "User"}</div>
                  <div className="text-xs text-muted-foreground truncate">@{active.username ?? "—"}</div>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.map(m => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{m.content}</div>
                    </motion.div>
                  );
                })}
                {!thread.length && <div className="text-center text-sm text-muted-foreground py-10">Say hi 👋</div>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message…" maxLength={4000} />
                <Button type="submit" disabled={!input.trim() || sending} className="bg-gradient-primary glow"><Send className="size-4" /></Button>
              </form>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground p-10 text-center">
              <div>
                <MessageCircle className="size-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation or search a username.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

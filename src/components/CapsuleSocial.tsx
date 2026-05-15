import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, UserPlus, UserCheck, Send, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Profile = { id: string; full_name: string | null; avatar_url: string | null };
type Comment = { id: string; user_id: string; content: string; created_at: string; profile?: Profile };

function Avatar({ profile, size = 32 }: { profile?: Profile; size?: number }) {
  const initial = (profile?.full_name ?? "?")[0]?.toUpperCase() ?? "?";
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}

export function LikeButton({ capsuleId, compact = false }: { capsuleId: string; compact?: boolean }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { count: c } = await supabase
        .from("capsule_likes").select("id", { count: "exact", head: true }).eq("capsule_id", capsuleId);
      if (active) setCount(c ?? 0);
      if (user) {
        const { data } = await supabase
          .from("capsule_likes").select("id").eq("capsule_id", capsuleId).eq("user_id", user.id).maybeSingle();
        if (active) setLiked(!!data);
      }
    })();
    return () => { active = false; };
  }, [capsuleId, user]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast.error("Sign in to like");
    if (busy) return;
    setBusy(true);
    if (liked) {
      const { error } = await supabase.from("capsule_likes").delete().eq("capsule_id", capsuleId).eq("user_id", user.id);
      if (!error) { setLiked(false); setCount((c) => Math.max(0, c - 1)); }
    } else {
      const { error } = await supabase.from("capsule_likes").insert({ capsule_id: capsuleId, user_id: user.id });
      if (!error) { setLiked(true); setCount((c) => c + 1); }
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 transition ${liked ? "text-rose-400" : "text-muted-foreground hover:text-foreground"} ${compact ? "text-sm" : ""}`}
    >
      <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

export function ShareButton({ capsuleId, compact = false }: { capsuleId: string; compact?: boolean }) {
  const share = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/capsule/${capsuleId}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch { /* user dismissed */ }
  };
  return (
    <button onClick={share} className={`inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition ${compact ? "text-sm" : ""}`}>
      <Share2 className="size-4" />
      <span>Share</span>
    </button>
  );
}

export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { count: c } = await supabase
        .from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetUserId);
      if (active) setCount(c ?? 0);
      if (user && user.id !== targetUserId) {
        const { data } = await supabase
          .from("user_follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetUserId).maybeSingle();
        if (active) setFollowing(!!data);
      }
    })();
    return () => { active = false; };
  }, [targetUserId, user]);

  if (user?.id === targetUserId) {
    return <span className="text-xs text-muted-foreground">{count} follower{count !== 1 ? "s" : ""}</span>;
  }

  const toggle = async () => {
    if (!user) return toast.error("Sign in to follow");
    if (busy) return;
    setBusy(true);
    if (following) {
      const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      if (!error) { setFollowing(false); setCount((c) => Math.max(0, c - 1)); }
    } else {
      const { error } = await supabase.from("user_follows").insert({ follower_id: user.id, following_id: targetUserId });
      if (!error) { setFollowing(true); setCount((c) => c + 1); }
    }
    setBusy(false);
  };

  return (
    <Button size="sm" variant={following ? "outline" : "default"} className={following ? "glass" : "bg-gradient-primary glow"} onClick={toggle} disabled={busy}>
      {following ? <UserCheck className="size-4 mr-1.5" /> : <UserPlus className="size-4 mr-1.5" />}
      {following ? "Following" : "Follow"}
      <span className="ml-2 text-xs opacity-70 tabular-nums">{count}</span>
    </Button>
  );
}

export function Comments({ capsuleId, ownerId }: { capsuleId: string; ownerId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("capsule_comments").select("*").eq("capsule_id", capsuleId).order("created_at", { ascending: false });
    const comments = (data ?? []) as Comment[];
    if (comments.length) {
      const ids = [...new Set(comments.map((c) => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p as Profile]));
      comments.forEach((c) => { c.profile = byId.get(c.user_id); });
    }
    setItems(comments);
    setLoading(false);
  };
  useEffect(() => { load(); }, [capsuleId]);

  const post = async () => {
    if (!user) return toast.error("Sign in to comment");
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) return toast.error("Comment too long");
    setPosting(true);
    const { error } = await supabase.from("capsule_comments").insert({ capsule_id: capsuleId, user_id: user.id, content: trimmed });
    setPosting(false);
    if (error) return toast.error(error.message);
    setText("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("capsule_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.filter((x) => x.id !== id));
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="size-5 text-primary" />
        <h2 className="font-display font-semibold text-xl">Comments</h2>
        <span className="text-sm text-muted-foreground">({items.length})</span>
      </div>

      {user ? (
        <div className="glass rounded-xl p-3 mb-5 flex gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a thought…"
            rows={2}
            maxLength={2000}
            className="border-0 bg-transparent focus-visible:ring-0 resize-none"
          />
          <Button onClick={post} disabled={posting || !text.trim()} size="sm" className="bg-gradient-primary glow self-end">
            <Send className="size-4 mr-1.5" /> Post
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-5">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Be the first to comment.</p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((c) => {
              const canDelete = user && (user.id === c.user_id || user.id === ownerId);
              return (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="glass rounded-xl p-4 flex gap-3"
                >
                  <Avatar profile={c.profile} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm truncate">{c.profile?.full_name || "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                  {canDelete && (
                    <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

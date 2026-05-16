import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Globe, Unlock, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FilePreview, type CapsuleFile } from "@/components/FilePreview";
import { LikeButton, ShareButton } from "@/components/CapsuleSocial";
import { getCountdown } from "@/lib/countdown";

function shortRemaining(target: string) {
  const c = getCountdown(target);
  if (c.done) return "unlocked";
  if (c.years) return `${c.years}y ${c.months}mo`;
  if (c.months) return `${c.months}mo ${c.days}d`;
  if (c.days) return `${c.days}d ${c.hours}h`;
  if (c.hours) return `${c.hours}h ${c.minutes}m`;
  return `${c.minutes}m ${c.seconds}s`;
}

export const Route = createFileRoute("/explore")({
  component: Explore,
  head: () => ({
    meta: [
      { title: "Explore Public Capsules — Time Capsule" },
      { name: "description", content: "Browse memories sealed by the community and revealed when their time arrived." },
    ],
  }),
});

type Capsule = {
  id: string; user_id: string; title: string; description: string | null;
  unlock_time: string; is_public: boolean; thumbnail_url: string | null; created_at: string;
};
type Owner = { id: string; full_name: string | null; avatar_url: string | null };

function Explore() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [filesByCapsule, setFilesByCapsule] = useState<Record<string, CapsuleFile[]>>({});
  const [owners, setOwners] = useState<Record<string, Owner>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: caps } = await supabase
        .from("capsules").select("*")
        .eq("is_public", true)
        .order("unlock_time", { ascending: false })
        .limit(60);
      const list = (caps as Capsule[]) ?? [];
      setCapsules(list);
      if (list.length) {
        const ids = list.map((c) => c.id);
        const userIds = [...new Set(list.map((c) => c.user_id))];
        const [{ data: files }, { data: profs }] = await Promise.all([
          supabase.from("capsule_files").select("*").in("capsule_id", ids),
          supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
        ]);
        const byCap: Record<string, CapsuleFile[]> = {};
        ((files as CapsuleFile[]) ?? []).forEach((f) => {
          (byCap[f.capsule_id] ||= []).push(f);
        });
        setFilesByCapsule(byCap);
        setOwners(Object.fromEntries(((profs as Owner[]) ?? []).map((p) => [p.id, p])));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => capsules.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || (c.description ?? "").toLowerCase().includes(q.toLowerCase())),
    [capsules, q],
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-display font-bold">Public capsules</h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Memories sealed by the community, revealed when their time arrived.</p>
      </div>
      <div className="max-w-md mx-auto relative mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search capsules…" className="pl-9 glass h-11" />
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No public capsules yet. Be the first to seal one!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((c, i) => (
            <ExploreCard
              key={c.id}
              capsule={c}
              files={filesByCapsule[c.id] ?? []}
              owner={owners[c.user_id]}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExploreCard({ capsule, files, owner, index }: { capsule: Capsule; files: CapsuleFile[]; owner?: Owner; index: number }) {
  const initial = (owner?.full_name ?? "?")[0]?.toUpperCase() ?? "?";
  const unlocked = new Date(capsule.unlock_time).getTime() <= Date.now();
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass-strong rounded-xl overflow-hidden flex flex-col text-xs"
    >
      {capsule.thumbnail_url && (
        <Link to="/capsule/$id" params={{ id: capsule.id }} className="block aspect-[4/3] overflow-hidden">
          <img src={capsule.thumbnail_url} alt={capsule.title} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
        </Link>
      )}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          {owner?.avatar_url ? (
            <img src={owner.avatar_url} alt="" className="size-5 rounded-full object-cover" />
          ) : (
            <div className="size-5 rounded-full bg-gradient-primary grid place-items-center text-[10px] font-semibold text-primary-foreground">{initial}</div>
          )}
          <div className="text-[11px] text-muted-foreground truncate flex-1">{owner?.full_name || "Anonymous"}</div>
          <Badge variant="secondary" className="glass text-[10px] px-1.5 py-0 h-4">
            {unlocked ? <Unlock className="size-2.5" /> : <Lock className="size-2.5" />}
          </Badge>
        </div>

        <Link to="/capsule/$id" params={{ id: capsule.id }} className="hover:text-primary transition">
          <h2 className="font-display font-bold text-sm leading-tight line-clamp-2">{capsule.title}</h2>
        </Link>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {unlocked ? `Unlocked ${new Date(capsule.unlock_time).toLocaleDateString()}` : `Unlocks in ${shortRemaining(capsule.unlock_time)}`}
        </div>

        {unlocked ? (
          files.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {files.slice(0, 2).map((f) => <FilePreview key={f.id} file={f} />)}
            </div>
          )
        ) : (
          <div className="mt-2 glass rounded-lg py-4 grid place-items-center text-center">
            <Lock className="size-4 text-primary" />
            <div className="text-[10px] text-muted-foreground mt-1">Sealed</div>
          </div>
        )}
        {unlocked && files.length > 2 && (
          <Link to="/capsule/$id" params={{ id: capsule.id }} className="text-[10px] text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
            <Globe className="size-2.5" /> +{files.length - 2} more
          </Link>
        )}

        <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-3">
          <LikeButton capsuleId={capsule.id} compact />
          <ShareButton capsuleId={capsule.id} compact />
          <Link to="/capsule/$id" params={{ id: capsule.id }} className="ml-auto text-[11px] text-primary hover:underline">
            Open →
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

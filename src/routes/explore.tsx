import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Globe, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FilePreview, type CapsuleFile } from "@/components/FilePreview";
import { LikeButton, ShareButton } from "@/components/CapsuleSocial";

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
        .lte("unlock_time", new Date().toISOString())
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
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No public capsules yet. Be the first to seal one!</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
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
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-strong rounded-2xl overflow-hidden flex flex-col"
    >
      {capsule.thumbnail_url && (
        <Link to="/capsule/$id" params={{ id: capsule.id }} className="block aspect-[2/1] overflow-hidden">
          <img src={capsule.thumbnail_url} alt={capsule.title} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
        </Link>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          {owner?.avatar_url ? (
            <img src={owner.avatar_url} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <div className="size-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">{initial}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{owner?.full_name || "Anonymous"}</div>
            <div className="text-xs text-muted-foreground">Unlocked {new Date(capsule.unlock_time).toLocaleDateString()}</div>
          </div>
          <Badge variant="secondary" className="glass">
            <Unlock className="size-3 mr-1" /> Open
          </Badge>
        </div>

        <Link to="/capsule/$id" params={{ id: capsule.id }} className="hover:text-primary transition">
          <h2 className="font-display font-bold text-2xl leading-tight">{capsule.title}</h2>
        </Link>
        {capsule.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{capsule.description}</p>}

        {files.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {files.slice(0, 4).map((f) => <FilePreview key={f.id} file={f} />)}
          </div>
        )}
        {files.length > 4 && (
          <Link to="/capsule/$id" params={{ id: capsule.id }} className="text-xs text-primary hover:underline mt-3 inline-flex items-center gap-1">
            <Globe className="size-3" /> +{files.length - 4} more file{files.length - 4 !== 1 ? "s" : ""}
          </Link>
        )}

        <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-5">
          <LikeButton capsuleId={capsule.id} compact />
          <ShareButton capsuleId={capsule.id} compact />
          <Link to="/capsule/$id" params={{ id: capsule.id }} className="ml-auto text-sm text-primary hover:underline">
            Open →
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

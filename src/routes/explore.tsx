import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { CapsuleCard, type Capsule } from "@/components/CapsuleCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/explore")({
  component: Explore,
  head: () => ({
    meta: [
      { title: "Explore Public Capsules — Time Capsule" },
      { name: "description", content: "Browse memories sealed by the community and revealed when their time arrived." },
    ],
  }),
});

function Explore() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("capsules").select("*").eq("is_public", true).lte("unlock_time", new Date().toISOString()).order("unlock_time", { ascending: false }).then(({ data }) => {
      setCapsules((data as Capsule[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => capsules.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())), [capsules, q]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-display font-bold">Public capsules</h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Memories sealed by the community, revealed when their time arrived.</p>
      </div>
      <div className="max-w-md mx-auto relative mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9 glass h-11" />
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No public capsules yet. Be the first to seal one!</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => <CapsuleCard key={c.id} capsule={c} />)}
        </div>
      )}
    </div>
  );
}

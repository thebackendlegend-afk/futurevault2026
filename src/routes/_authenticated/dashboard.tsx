import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CapsuleCard, type Capsule } from "@/components/CapsuleCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("capsules").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCapsules((data as Capsule[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return capsules.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
      const unlocked = new Date(c.unlock_time).getTime() <= now;
      if (tab === "locked" && unlocked) return false;
      if (tab === "unlocked" && !unlocked) return false;
      return true;
    });
  }, [capsules, q, tab]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this capsule? This cannot be undone.")) return;
    const { error } = await supabase.from("capsules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Capsule deleted");
    setCapsules((c) => c.filter((x) => x.id !== id));
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold">Your capsules</h1>
          <p className="text-muted-foreground mt-1">Time, sealed with care.</p>
        </div>
        <Button asChild className="bg-gradient-primary glow h-11">
          <Link to="/create"><Plus className="size-4 mr-1" /> New capsule</Link>
        </Button>
      </motion.div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search capsules…" className="pl-9 glass" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="glass">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
            <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong rounded-2xl p-16 text-center">
          <h3 className="font-display text-xl">No capsules yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Lock your first memory in time.</p>
          <Button asChild className="mt-6 bg-gradient-primary glow"><Link to="/create">Create capsule</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => <CapsuleCard key={c.id} capsule={c} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function CapsuleRatingSummary({ capsuleId, compact = false }: { capsuleId: string; compact?: boolean }) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("capsule_reviews")
        .select("rating")
        .eq("capsule_id", capsuleId);
      if (cancelled) return;
      const rows = (data ?? []) as { rating: number }[];
      setCount(rows.length);
      setAvg(rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0);
    })();

    const ch = supabase
      .channel(`reviews-${capsuleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "capsule_reviews", filter: `capsule_id=eq.${capsuleId}` }, async () => {
        const { data } = await (supabase as any)
          .from("capsule_reviews").select("rating").eq("capsule_id", capsuleId);
        const rows = (data ?? []) as { rating: number }[];
        setCount(rows.length);
        setAvg(rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [capsuleId]);

  if (count === 0) return null;
  return (
    <div className={`inline-flex items-center gap-1.5 ${compact ? "text-xs" : "text-sm"} text-muted-foreground`}>
      <Star className={`${compact ? "size-3.5" : "size-4"} fill-amber-400 text-amber-400`} />
      <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
      <span>· {count} review{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

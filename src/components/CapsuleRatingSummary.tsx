import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function CapsuleRatingSummary({ capsuleId, compact = false }: { capsuleId: string; compact?: boolean }) {
  const { user } = useAuth();
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("capsule_reviews")
        .select("rating, user_id")
        .eq("capsule_id", capsuleId);
      if (cancelled) return;
      const rows = (data ?? []) as { rating: number; user_id: string }[];
      setCount(rows.length);
      setAvg(rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0);
      const own = user ? rows.find((r) => r.user_id === user.id) : null;
      setMine(own ? own.rating : null);
    };
    load();

    const ch = supabase
      .channel(`reviews-${capsuleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "capsule_reviews", filter: `capsule_id=eq.${capsuleId}` }, load)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [capsuleId, user?.id]);

  if (count === 0 && mine === null) return null;
  return (
    <div className={`inline-flex items-center gap-3 ${compact ? "text-xs" : "text-sm"} flex-wrap`}>
      {count > 0 && (
        <div className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Star className={`${compact ? "size-3.5" : "size-4"} fill-amber-400 text-amber-400`} />
          <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
          <span>· {count} review{count !== 1 ? "s" : ""}</span>
        </div>
      )}
      {mine !== null && (
        <div className="inline-flex items-center gap-1.5 glass rounded-full px-2.5 py-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Your rating</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`${compact ? "size-3" : "size-3.5"} ${n <= mine ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

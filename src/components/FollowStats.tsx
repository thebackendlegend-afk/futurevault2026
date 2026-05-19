import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function FollowStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ followers: 0, following: 0, friends: 0 });

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const load = async () => {
      const [{ data: followers }, { data: following }] = await Promise.all([
        supabase.from("user_follows").select("follower_id").eq("following_id", userId),
        supabase.from("user_follows").select("following_id").eq("follower_id", userId),
      ]);
      if (!alive) return;
      const followerIds = new Set((followers ?? []).map(r => r.follower_id));
      const followingIds = new Set((following ?? []).map(r => r.following_id));
      const friends = [...followingIds].filter(id => followerIds.has(id)).length;
      setStats({ followers: followerIds.size, following: followingIds.size, friends });
    };
    load();
    const ch = supabase.channel(`follows-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_follows" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [userId]);

  const items = [
    { label: "Followers", value: stats.followers },
    { label: "Following", value: stats.following },
    { label: "Friends", value: stats.friends },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {items.map(s => (
        <div key={s.label} className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-display font-bold text-gradient">{s.value}</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

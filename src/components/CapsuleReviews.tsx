import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
};

function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`transition ${onChange ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}

export function CapsuleReviews({ capsuleId, ownerId }: { capsuleId: string; ownerId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = user?.id === ownerId;
  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("capsule_reviews")
      .select("*")
      .eq("capsule_id", capsuleId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Review[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((r) => { r.author = map.get(r.user_id) as any; });
    }
    setReviews(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [capsuleId]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setText(myReview.review ?? "");
    }
  }, [myReview?.id]);

  const submit = async () => {
    if (!user) return toast.error("Sign in to leave a review");
    if (!rating) return toast.error("Pick a star rating");
    setBusy(true);
    const { error } = await (supabase as any)
      .from("capsule_reviews")
      .upsert({
        capsule_id: capsuleId,
        user_id: user.id,
        rating,
        review: text.trim() || null,
      }, { onConflict: "capsule_id,user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(myReview ? "Review updated" : "Review posted");
    load();
  };

  const remove = async () => {
    if (!myReview) return;
    const { error } = await (supabase as any)
      .from("capsule_reviews")
      .delete()
      .eq("id", myReview.id);
    if (error) return toast.error(error.message);
    setRating(0); setText("");
    load();
  };

  return (
    <section className="mt-10 pt-8 border-t border-border/40">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-2xl font-semibold">Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={Math.round(avg)} size={16} />
            <span className="font-medium">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {user && !isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <div className="text-sm text-muted-foreground mb-2">
            {myReview ? "Update your review" : "Rate this capsule"}
          </div>
          <Stars value={rating} onChange={setRating} />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts (optional)…"
            rows={3}
            maxLength={1000}
            className="mt-3"
          />
          <div className="flex gap-2 mt-3">
            <Button onClick={submit} disabled={busy} className="bg-gradient-primary">
              {myReview ? "Update" : "Post review"}
            </Button>
            {myReview && (
              <Button variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                Delete
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {!user && (
        <div className="glass rounded-2xl p-5 mb-6 text-sm text-muted-foreground text-center">
          <a href="/login" className="text-primary underline">Sign in</a> to leave a rating and review.
        </div>
      )}

      {user && isOwner && (
        <div className="glass rounded-2xl p-5 mb-6 text-sm text-muted-foreground text-center">
          You can't review your own capsule.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                {r.author?.avatar_url ? (
                  <img src={r.author.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <div className="size-8 rounded-full bg-muted grid place-items-center text-xs">
                    {(r.author?.full_name ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.author?.full_name ?? "Anonymous"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Stars value={r.rating} size={14} />
              </div>
              {r.review && <p className="text-sm whitespace-pre-wrap">{r.review}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, ArrowLeft, MessageSquare } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { FilePreview, type CapsuleFile } from "@/components/FilePreview";
import { LikeButton, ShareButton, FollowButton, Comments } from "@/components/CapsuleSocial";
import { PrivateShareButton } from "@/components/PrivateShareButton";
import { CapsuleReviews } from "@/components/CapsuleReviews";

export const Route = createFileRoute("/capsule/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : undefined }),
  component: CapsulePage,
});

type Capsule = {
  id: string; user_id: string; title: string; description: string | null;
  message: string | null;
  unlock_time: string; is_public: boolean; thumbnail_url: string | null; created_at: string;
  share_token?: string | null;
};


function CapsulePage() {
  const { id } = Route.useParams();
  const { token } = Route.useSearch();
  const { user } = useAuth();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [files, setFiles] = useState<CapsuleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viaLink, setViaLink] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let { data: c } = await supabase.from("capsules").select("*").eq("id", id).maybeSingle();
      let usedLink = false;
      if (!c && token) {
        const { data: shared } = await (supabase as any).rpc("get_shared_capsule", { p_id: id, p_token: token });
        if (shared && shared.length) { c = shared[0]; usedLink = true; }
      }
      setCapsule(c as Capsule | null);
      setViaLink(usedLink);
      if (c) {
        if (usedLink) {
          const { data: f } = await (supabase as any).rpc("get_shared_capsule_files", { p_id: id, p_token: token });
          setFiles((f as CapsuleFile[]) ?? []);
        } else {
          const { data: f } = await supabase.from("capsule_files").select("*").eq("capsule_id", id);
          setFiles((f as CapsuleFile[]) ?? []);
        }
      }
      setLoading(false);
    };
    load();
  }, [id, token]);

  useEffect(() => {
    if (!capsule) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [capsule]);

  if (loading) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!capsule) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-display font-bold">Capsule not found</h1>
        <p className="text-muted-foreground mt-2">It might be private or no longer exist.</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const unlocked = new Date(capsule.unlock_time).getTime() <= now;
  const isOwner = user?.id === capsule.user_id;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link to={isOwner ? "/dashboard" : "/explore"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl overflow-hidden"
      >
        {capsule.thumbnail_url && (
          <div className="aspect-[3/1] overflow-hidden">
            <img src={capsule.thumbnail_url} alt={capsule.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-4xl sm:text-5xl font-display font-bold">{capsule.title}</h1>
              {capsule.description && <p className="text-muted-foreground mt-3 max-w-2xl">{capsule.description}</p>}
            </div>
            {capsule.is_public && !isOwner && <FollowButton targetUserId={capsule.user_id} />}
          </div>

          {isOwner && !capsule.is_public && capsule.share_token && (
            <PrivateShareButton capsuleId={capsule.id} shareToken={capsule.share_token} />
          )}

          {viaLink && (
            <div className="mt-4 text-xs text-muted-foreground glass rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <span>🔗 You're viewing this capsule via a private share link.</span>
            </div>
          )}

          {capsule.is_public && (
            <div className="flex items-center gap-5 mt-5 pb-5 border-b border-border/40">
              <LikeButton capsuleId={capsule.id} />
              <ShareButton capsuleId={capsule.id} />
            </div>
          )}

          <AnimatePresence mode="wait">
            {!unlocked ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-10"
              >
                <div className="grid place-items-center mb-8">
                  <motion.div
                    animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="size-24 rounded-3xl bg-gradient-primary grid place-items-center glow"
                  >
                    <Lock className="size-12 text-primary-foreground" />
                  </motion.div>
                </div>
                <CountdownTimer target={capsule.unlock_time} />
                <p className="text-center text-muted-foreground text-sm mt-6">
                  {files.length} file{files.length !== 1 ? "s" : ""} sealed inside · unlocks {new Date(capsule.unlock_time).toLocaleString()}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="unlocked"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="mt-10"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-xl bg-gradient-primary grid place-items-center glow">
                    <Unlock className="size-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-xl">Capsule unlocked</div>
                    <div className="text-xs text-muted-foreground">Sealed {new Date(capsule.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {capsule.message && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-5 sm:p-6 mb-6 border-l-4 border-primary"
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
                      <MessageSquare className="size-3.5" /> Message from the past
                    </div>
                    <p className="whitespace-pre-wrap font-display text-lg leading-relaxed">{capsule.message}</p>
                  </motion.div>
                )}

                {files.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files in this capsule.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {files.map((f) => (
                      <FilePreview key={f.id} file={f} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {capsule.is_public && unlocked && (
            <Comments capsuleId={capsule.id} ownerId={capsule.user_id} />
          )}

          {unlocked && (capsule.is_public || isOwner || viaLink) && (
            <CapsuleReviews capsuleId={capsule.id} ownerId={capsule.user_id} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

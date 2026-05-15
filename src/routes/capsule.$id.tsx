import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Download, ArrowLeft, Share2, FileText, Image as ImageIcon, Music, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatBytes } from "@/lib/countdown";

export const Route = createFileRoute("/capsule/$id")({ component: CapsulePage });

type Capsule = {
  id: string; user_id: string; title: string; description: string | null;
  unlock_time: string; is_public: boolean; thumbnail_url: string | null; created_at: string;
};
type CapsuleFile = {
  id: string; capsule_id: string; file_name: string; file_type: string | null;
  file_size: number | null; storage_path: string;
};

function iconFor(type: string | null) {
  if (!type) return FileText;
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  if (type.startsWith("audio/")) return Music;
  return FileText;
}

function CapsulePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [files, setFiles] = useState<CapsuleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: c } = await supabase.from("capsules").select("*").eq("id", id).maybeSingle();
      setCapsule(c as Capsule | null);
      if (c) {
        const { data: f } = await supabase.from("capsule_files").select("*").eq("capsule_id", id);
        setFiles((f as CapsuleFile[]) ?? []);
      }
      setLoading(false);
    };
    load();
  }, [id]);

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

  const downloadFile = async (f: CapsuleFile) => {
    const { data, error } = await supabase.storage.from("capsule-files").createSignedUrl(f.storage_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

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
            <div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold">{capsule.title}</h1>
              {capsule.description && <p className="text-muted-foreground mt-3 max-w-2xl">{capsule.description}</p>}
            </div>
            <Button variant="outline" size="sm" className="glass" onClick={share}>
              <Share2 className="size-4 mr-2" /> Share
            </Button>
          </div>

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

                {files.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files in this capsule.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {files.map((f) => {
                      const Icon = iconFor(f.file_type);
                      return (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-xl p-4 flex items-center gap-3"
                        >
                          <div className="size-10 rounded-lg bg-primary/20 grid place-items-center shrink-0">
                            <Icon className="size-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{f.file_name}</div>
                            <div className="text-xs text-muted-foreground">{formatBytes(f.file_size ?? 0)}</div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => downloadFile(f)}>
                            <Download className="size-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

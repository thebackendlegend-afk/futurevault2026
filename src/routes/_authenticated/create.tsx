import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Upload, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatBytes } from "@/lib/countdown";

export const Route = createFileRoute("/_authenticated/create")({ component: Create });

const PRESETS = [
  { label: "2 hours", h: 2 },
  { label: "1 day", h: 24 },
  { label: "30 days", h: 24 * 30 },
  { label: "1 year", h: 24 * 365 },
  { label: "10 years", h: 24 * 365 * 10 },
];

function Create() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [thumb, setThumb] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const setPreset = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setUnlockAt(d.toISOString().slice(0, 16));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Title required");
    if (!unlockAt) return toast.error("Pick an unlock date");
    const unlockTime = new Date(unlockAt);
    if (unlockTime.getTime() <= Date.now()) return toast.error("Unlock date must be in the future");
    const maxTime = Date.now() + 100 * 365.25 * 24 * 3600 * 1000;
    if (unlockTime.getTime() > maxTime) return toast.error("Maximum lock duration is 100 years");

    setLoading(true);
    try {
      // Upload thumbnail
      let thumbnail_url: string | null = null;
      if (thumb) {
        setProgress("Uploading thumbnail…");
        const path = `${user.id}/${crypto.randomUUID()}-${thumb.name}`;
        const { error } = await supabase.storage.from("thumbnails").upload(path, thumb);
        if (error) throw error;
        thumbnail_url = supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
      }

      // Create capsule
      setProgress("Sealing capsule…");
      const { data: capsule, error: cErr } = await supabase
        .from("capsules")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          message: message.trim() || null,
          unlock_time: unlockTime.toISOString(),
          is_public: isPublic,
          thumbnail_url,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // Upload files
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Uploading file ${i + 1} of ${files.length}…`);
        const storagePath = `${user.id}/${capsule.id}/${crypto.randomUUID()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("capsule-files").upload(storagePath, f);
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase.from("capsule_files").insert({
          capsule_id: capsule.id,
          file_name: f.name,
          file_type: f.type || "application/octet-stream",
          file_size: f.size,
          storage_path: storagePath,
        });
        if (rowErr) throw rowErr;
      }

      toast.success("Capsule sealed!");
      nav({ to: "/capsule/$id", params: { id: capsule.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create capsule");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-gradient-primary grid place-items-center glow">
            <Lock className="size-5 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold">New capsule</h1>
        </div>
        <p className="text-muted-foreground mb-8">Seal your memories until the future.</p>

        <form onSubmit={onSubmit} className="space-y-6 glass-strong rounded-2xl p-6 sm:p-8">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Letter to my future self" className="mt-1.5" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's inside this capsule…" className="mt-1.5" rows={2} />
            <p className="text-xs text-muted-foreground mt-1">Visible before unlock as a teaser.</p>
          </div>

          <div>
            <Label>Message to the future</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dear future me…" className="mt-1.5" rows={5} maxLength={5000} />
            <p className="text-xs text-muted-foreground mt-1">Sealed inside — only revealed when the capsule unlocks.</p>
          </div>

          <div>
            <Label>Unlock date & time *</Label>
            <Input type="datetime-local" value={unlockAt} onChange={(e) => setUnlockAt(e.target.value)} className="mt-1.5" required />
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map((p) => (
                <Button key={p.label} type="button" size="sm" variant="outline" className="glass" onClick={() => setPreset(p.h)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Maximum lock duration: 100 years.</p>
          </div>

          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div>
              <div className="font-medium">Public capsule</div>
              <div className="text-xs text-muted-foreground">Visible to everyone after unlock</div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div>
            <Label>Thumbnail (optional)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} className="mt-1.5" />
          </div>

          <div>
            <Label>Files</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              className={`mt-1.5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <Upload className="size-8 mx-auto text-muted-foreground" />
              <p className="text-sm mt-2">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Photos, videos, audio, documents — any file type</p>
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between glass rounded-lg px-3 py-2 text-sm">
                    <span className="truncate">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                      <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                        <X className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary glow h-12 text-base">
            {loading ? progress || "Sealing…" : "Seal capsule"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

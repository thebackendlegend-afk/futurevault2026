import { useEffect, useState } from "react";
import { Download, FileText, Image as ImageIcon, Music, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/countdown";
import { toast } from "sonner";

export type CapsuleFile = {
  id: string;
  capsule_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
};

function iconFor(type: string | null) {
  if (!type) return FileText;
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  if (type.startsWith("audio/")) return Music;
  return FileText;
}

export function FilePreview({ file }: { file: CapsuleFile }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const Icon = iconFor(file.file_type);
  const type = file.file_type ?? "";
  const isImage = type.startsWith("image/");
  const isVideo = type.startsWith("video/");
  const isAudio = type.startsWith("audio/");

  useEffect(() => {
    let active = true;
    supabase.storage
      .from("capsule-files")
      .createSignedUrl(file.storage_path, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setLoading(false);
          return;
        }
        setUrl(data.signedUrl);
        setLoading(false);
      });
    return () => { active = false; };
  }, [file.storage_path]);

  const download = async () => {
    if (!url) return toast.error("Preview not ready");
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file_name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col">
      <div className="aspect-video bg-black/40 grid place-items-center relative overflow-hidden">
        {loading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : isImage && url ? (
          <img src={url} alt={file.file_name} className="w-full h-full object-cover" loading="lazy" />
        ) : isVideo && url ? (
          <video src={url} controls className="w-full h-full" preload="metadata" />
        ) : isAudio && url ? (
          <div className="w-full px-4">
            <Icon className="size-10 text-primary mx-auto mb-3" />
            <audio src={url} controls className="w-full" preload="metadata" />
          </div>
        ) : (
          <Icon className="size-12 text-primary/70" />
        )}
      </div>
      <div className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{file.file_name}</div>
          <div className="text-xs text-muted-foreground">{formatBytes(file.file_size ?? 0)}</div>
        </div>
        <Button size="sm" variant="outline" className="glass shrink-0" onClick={download} disabled={!url}>
          <Download className="size-4 mr-1.5" /> Download
        </Button>
      </div>
    </div>
  );
}

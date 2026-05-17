import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PrivateShareButton({ capsuleId, shareToken }: { capsuleId: string; shareToken: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/capsule/${capsuleId}?token=${shareToken}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Private link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="mt-5">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="glass">
        <Link2 className="size-4 mr-2" /> {open ? "Hide share link" : "Share with link"}
      </Button>
      {open && (
        <div className="mt-3 glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-2">
            Anyone with this link can view your private capsule. Keep it safe.
          </div>
          <div className="flex gap-2">
            <Input readOnly value={url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button size="sm" onClick={copy} variant="secondary">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

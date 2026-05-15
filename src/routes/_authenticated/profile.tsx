import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Mail, User as UserIcon, Lock, Package, Camera, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

type Stats = { total: number; locked: number; unlocked: number };

function Profile() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [initial, setInitial] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, locked: 0, unlocked: 0 });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: profile }, { data: capsules }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("capsules").select("unlock_time").eq("user_id", user.id),
      ]);
      if (!active) return;
      const name = profile?.full_name ?? "";
      setFullName(name);
      setInitial(name);
      setAvatarUrl(profile?.avatar_url ?? null);
      const now = Date.now();
      const list = capsules ?? [];
      setStats({
        total: list.length,
        locked: list.filter((c) => new Date(c.unlock_time).getTime() > now).length,
        unlocked: list.filter((c) => new Date(c.unlock_time).getTime() <= now).length,
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const onPickAvatar = () => fileInput.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { upsert: true, contentType: f.type });
      if (upErr) throw upErr;
      const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(url);
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    setUploading(false);
    if (error) return toast.error(error.message);
    setAvatarUrl(null);
    toast.success("Photo removed");
  };

  const dirty = fullName.trim() !== initial.trim();

  const save = async () => {
    if (!user || !dirty) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setInitial(fullName.trim());
    toast.success("Profile updated");
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  const initials =
    (fullName || user?.email || "?")
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-8">
          <div className="relative group">
            <button
              type="button"
              onClick={onPickAvatar}
              className="size-20 rounded-2xl overflow-hidden bg-gradient-primary grid place-items-center text-2xl font-display font-bold text-primary-foreground glow relative"
              aria-label="Change profile photo"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                {uploading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
              </div>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl sm:text-4xl font-display font-bold truncate">
              {fullName || "Welcome"}
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5">
              <Mail className="size-3.5" /> {user?.email}
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="glass" onClick={onPickAvatar} disabled={uploading}>
                <Camera className="size-3.5 mr-1.5" /> {avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={removeAvatar} disabled={uploading}>
                  <Trash2 className="size-3.5 mr-1.5" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Capsules", value: stats.total, icon: Package },
            { label: "Locked", value: stats.locked, icon: Lock },
            { label: "Unlocked", value: stats.unlocked, icon: Package },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              {loading ? (
                <Skeleton className="h-8 w-10 mx-auto" />
              ) : (
                <div className="text-3xl font-display font-bold text-gradient">{s.value}</div>
              )}
              <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile form */}
        <div className="glass-strong rounded-2xl p-6 space-y-5">
          <div>
            <Label className="flex items-center gap-1.5"><UserIcon className="size-3.5" /> Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
              className="mt-1.5"
              disabled={loading}
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Mail className="size-3.5" /> Email</Label>
            <Input value={user?.email ?? ""} disabled className="mt-1.5 opacity-70" />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save} disabled={!dirty || saving} className="bg-gradient-primary glow">
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="outline" className="glass" onClick={sendPasswordReset}>
              <Lock className="size-4 mr-1.5" /> Reset password
            </Button>
            <Button asChild variant="outline" className="glass">
              <Link to="/dashboard">My capsules</Link>
            </Button>
            <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={signOut}>
              <LogOut className="size-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

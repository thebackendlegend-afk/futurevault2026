import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

function Profile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => {
      setFullName(data?.full_name ?? "");
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <h1 className="text-4xl font-display font-bold mb-2">Profile</h1>
      <p className="text-muted-foreground mb-8">{user?.email}</p>
      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
        </div>
        <Button onClick={save} disabled={loading} className="bg-gradient-primary glow">
          {loading ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

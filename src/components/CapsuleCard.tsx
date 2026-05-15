import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Lock, Unlock, Globe, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "./CountdownTimer";

export type Capsule = {
  id: string;
  title: string;
  description: string | null;
  unlock_time: string;
  is_public: boolean;
  thumbnail_url: string | null;
  created_at: string;
};

export function CapsuleCard({ capsule, onDelete }: { capsule: Capsule; onDelete?: (id: string) => void }) {
  const unlocked = new Date(capsule.unlock_time).getTime() <= Date.now();
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass rounded-2xl overflow-hidden group flex flex-col"
    >
      <Link to="/capsule/$id" params={{ id: capsule.id }} className="block">
        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30">
          {capsule.thumbnail_url ? (
            <img src={capsule.thumbnail_url} alt={capsule.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid-bg grid place-items-center">
              {unlocked ? <Unlock className="size-12 text-primary" /> : <Lock className="size-12 text-primary/70" />}
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <Badge variant="secondary" className="glass">
              {capsule.is_public ? <Globe className="size-3 mr-1" /> : <EyeOff className="size-3 mr-1" />}
              {capsule.is_public ? "Public" : "Private"}
            </Badge>
          </div>
        </div>
        <div className="p-4 flex-1">
          <h3 className="font-display font-semibold text-lg truncate">{capsule.title}</h3>
          {capsule.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{capsule.description}</p>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {unlocked ? (
              <span className="text-primary font-medium">✦ Unlocked</span>
            ) : (
              <CountdownTimer target={capsule.unlock_time} compact />
            )}
          </div>
        </div>
      </Link>
      {onDelete && (
        <div className="px-4 pb-4">
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive w-full" onClick={() => onDelete(capsule.id)}>
            <Trash2 className="size-4 mr-2" /> Delete
          </Button>
        </div>
      )}
    </motion.div>
  );
}

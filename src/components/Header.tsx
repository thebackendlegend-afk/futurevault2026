import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Hourglass, LogOut } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";

export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center glow">
            <Hourglass className="size-5 text-primary-foreground" />
          </div>
          <span>Time<span className="text-gradient">Capsule</span></span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground transition">Explore</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">Dashboard</Link>
              <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:inline">Profile</Link>
              <Button size="sm" variant="ghost" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition">Login</Link>
              <Button asChild size="sm" className="bg-gradient-primary glow"><Link to="/register">Get started</Link></Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

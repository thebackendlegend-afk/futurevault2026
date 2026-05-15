import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Lock, Clock, Sparkles, Shield, Upload, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

        {/* floating orbs */}
        <motion.div
          className="absolute -top-20 -left-20 size-80 rounded-full bg-primary/30 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-40 -right-20 size-96 rounded-full bg-accent/30 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 py-24 sm:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-xs uppercase tracking-widest mb-8">
              <Sparkles className="size-3 text-accent" />
              <span>Send a message to the future</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-display font-bold leading-[1.05]">
              Lock your <span className="text-gradient">memories</span><br />
              in time.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Upload photos, videos and notes, then seal them in a digital capsule. Reopen them in 2 hours, 30 days, or 100 years from now.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary glow text-base h-12 px-8">
                <Link to="/register">Create your capsule</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 glass">
                <Link to="/explore">Explore public capsules</Link>
              </Button>
            </div>
          </motion.div>

          {/* preview capsule */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 max-w-2xl mx-auto glass-strong rounded-3xl p-8 relative"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center glow">
                  <Lock className="size-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-display font-semibold">Letter to my future self</div>
                  <div className="text-xs text-muted-foreground">Sealed · 12 files</div>
                </div>
              </div>
              <span className="text-xs uppercase tracking-widest text-accent">Locked</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["09", "23", "47"].map((n, i) => (
                <div key={i} className="bg-background/40 rounded-xl p-4 text-center">
                  <div className="text-3xl font-display font-bold tabular-nums text-gradient">{n}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {["Days", "Hours", "Min"][i]}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-display font-bold">A vault for tomorrow</h2>
          <p className="mt-4 text-muted-foreground">Built with care. Encrypted. Yours.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Upload, title: "Any file, any size", desc: "Photos, videos, audio, documents — store everything in one capsule." },
            { icon: Clock, title: "Lock for up to 100 years", desc: "Choose any unlock date from 2 hours away to a full century." },
            { icon: Shield, title: "Private by default", desc: "Files are sealed. No previews, no downloads — until time's up." },
            { icon: Globe, title: "Share with the world", desc: "Make capsules public so others can witness their unveiling." },
            { icon: Sparkles, title: "Live countdown", desc: "Watch the seconds tick down with a real-time animated timer." },
            { icon: Lock, title: "Cinematic reveal", desc: "Capsules open with a beautiful animation when their moment arrives." },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-6 hover:bg-white/[0.07] transition"
            >
              <div className="size-11 rounded-xl bg-gradient-primary grid place-items-center mb-4">
                <f.icon className="size-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <h2 className="text-4xl font-display font-bold">What will you say to the future?</h2>
            <p className="mt-3 text-muted-foreground">Start your first capsule in less than a minute.</p>
            <Button asChild size="lg" className="mt-8 bg-gradient-primary glow h-12 px-8">
              <Link to="/register">Begin →</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getCountdown } from "@/lib/countdown";

const UNITS = [
  { key: "years", label: "Years" },
  { key: "months", label: "Months" },
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const;

export function CountdownTimer({ target, compact = false }: { target: string | Date; compact?: boolean }) {
  const [c, setC] = useState(() => getCountdown(target));
  useEffect(() => {
    const id = setInterval(() => setC(getCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (compact) {
    const parts = [
      c.years && `${c.years}y`,
      c.months && `${c.months}mo`,
      c.days && `${c.days}d`,
      `${String(c.hours).padStart(2, "0")}:${String(c.minutes).padStart(2, "0")}:${String(c.seconds).padStart(2, "0")}`,
    ].filter(Boolean).join(" ");
    return <span className="font-mono tabular-nums text-sm">{parts}</span>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
      {UNITS.map((u) => (
        <motion.div
          key={u.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-xl p-4 text-center"
        >
          <div className="text-3xl sm:text-5xl font-display font-bold tabular-nums text-gradient">
            {String(c[u.key]).padStart(2, "0")}
          </div>
          <div className="text-xs uppercase tracking-widest mt-1 text-muted-foreground">{u.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

"use client";

// Watches the child's gamification snapshot and celebrates level-ups and newly
// earned badges with a framer-motion overlay + lightweight confetti burst.
// State is diffed against localStorage so a celebration fires exactly once.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Sparkles, Star } from "lucide-react";
import { childAuthService, type GamificationResponse } from "@/lib/api";
import { useChildStore } from "@/store/child";

type Celebration = { kind: "level" | "badge"; title: string; subtitle: string };

const COLORS = ["#a78bfa", "#e879f9", "#22d3ee", "#fbbf24", "#34d399", "#fb7185"];

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
    const dist = 120 + Math.random() * 120;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40,
      rot: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.1,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.6, rotate: p.rot }}
          transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
          className="absolute h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

export function GamificationCelebration() {
  const { isChildAuthed, childId } = useChildStore();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const seeded = useRef(false);

  const { data: gami } = useQuery({
    queryKey: ["child-gamification"],
    queryFn: async () => (await childAuthService.gamification()).data.data,
    enabled: isChildAuthed,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!gami || !childId) return;
    const key = `kc_gami_seen_${childId}`;
    let prev: { level: number; badges: string[] } | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) prev = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const earnedNow = gami.badges.filter((b) => b.earned).map((b) => b.key);
    const snapshot = { level: gami.level, badges: earnedNow };

    // First time we ever see this child: seed silently, never retro-celebrate.
    if (!prev) {
      try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch { /* ignore */ }
      seeded.current = true;
      return;
    }

    const events: Celebration[] = [];
    if (gami.level > prev.level) {
      events.push({ kind: "level", title: `Уровень ${gami.level}!`, subtitle: gami.title });
    }
    const prevSet = new Set(prev.badges);
    for (const b of gami.badges) {
      if (b.earned && !prevSet.has(b.key)) {
        events.push({ kind: "badge", title: "Новая ачивка!", subtitle: b.title });
      }
    }

    if (events.length) setQueue((q) => [...q, ...events]);
    try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch { /* ignore */ }
  }, [gami, childId]);

  // Auto-dismiss the front celebration.
  useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3200);
    return () => clearTimeout(t);
  }, [queue]);

  const current = queue[0];

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.title + current.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQueue((q) => q.slice(1))}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
        >
          <Confetti />
          <motion.div
            initial={{ scale: 0.6, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="relative rounded-3xl bg-[#15151f] border border-white/10 px-8 py-7 text-center shadow-2xl"
          >
            <motion.div
              initial={{ rotate: -12, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.05 }}
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30"
            >
              {current.kind === "level" ? (
                <Sparkles className="h-8 w-8 text-white" />
              ) : (
                <Trophy className="h-8 w-8 text-white" />
              )}
            </motion.div>
            <p className="text-lg font-bold text-white">{current.title}</p>
            <p className="text-sm text-fuchsia-300 mt-0.5 flex items-center justify-center gap-1.5">
              {current.kind === "badge" && <Star className="h-3.5 w-3.5 fill-current" />}
              {current.subtitle}
            </p>
            <p className="text-[11px] text-white/30 mt-3">нажми, чтобы закрыть</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

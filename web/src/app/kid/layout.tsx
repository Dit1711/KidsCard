"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Golos_Text } from "next/font/google";
import { useQuery } from "@tanstack/react-query";
import { Home, ShoppingBag, Target, PiggyBank, GraduationCap, LogOut } from "lucide-react";
import { useChildStore } from "@/store/child";
import { childAuthService } from "@/lib/api";
import { XpRing, StreakChip, levelTitle } from "@/components/kidkit";
import { GamificationCelebration } from "@/components/GamificationCelebration";
import { GeoConsentBanner } from "@/components/GeoConsentBanner";
import { useT } from "@/i18n/locale";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const golos = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap" });

const navItems = [
  { href: "/kid", labelKey: "kid.nav.home", Icon: Home },
  { href: "/kid/shop", labelKey: "kid.nav.spending", Icon: ShoppingBag },
  { href: "/kid/chores", labelKey: "kid.nav.quests", Icon: Target },
  { href: "/kid/goals", labelKey: "kid.nav.goals", Icon: PiggyBank },
  { href: "/kid/learn", labelKey: "kid.nav.learn", Icon: GraduationCap },
];

export default function KidLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isChildAuthed, hasHydrated, displayName, logout } = useChildStore();
  const t = useT();

  const { data: gami } = useQuery({
    queryKey: ["child-gamification"],
    queryFn: async () => (await childAuthService.gamification()).data.data,
    enabled: isChildAuthed,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (hasHydrated && !isChildAuthed) router.replace("/child-login");
  }, [hasHydrated, isChildAuthed, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080f]">
        <p className="text-fuchsia-300/70 animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }
  if (!isChildAuthed) return null;

  const name = displayName ?? t("kid.friend");
  const initial = name.charAt(0).toUpperCase();
  const pct = gami ? gami.xpIntoLevel / gami.xpForNext : 0;

  return (
    <div className={`fixed inset-0 overflow-y-auto bg-[#08080f] text-white ${golos.className}`}>
      <GamificationCelebration />
      {/* glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-md mx-auto w-full min-h-full flex flex-col">
        {/* Header */}
        <header className="px-5 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XpRing initial={initial} pct={pct} />
            <div>
              <p className="text-sm font-semibold leading-tight">{name}</p>
              <p className="text-[11px] text-fuchsia-300/90">
                {gami ? t("kid.level", { level: gami.level, title: levelTitle(gami.level) }) : t("common.loading")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="dark" />
            <StreakChip days={gami?.streakDays ?? 0} />
            <button
              onClick={() => { logout(); router.replace("/child-login"); }}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.05] border border-white/10 text-white/50 hover:text-white transition-colors"
              title={t("common.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pb-28 w-full space-y-5">
          <GeoConsentBanner />
          {children}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0c0c16]/95 backdrop-blur border-t border-white/[0.07] flex rounded-t-3xl">
          {navItems.map(({ href, labelKey, Icon }) => {
            const isActive = href === "/kid" ? pathname === "/kid" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? "text-fuchsia-300" : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

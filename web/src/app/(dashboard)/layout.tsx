"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Golos_Text } from "next/font/google";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { authService, familyService } from "@/lib/api";
import { NotificationBell } from "@/components/NotificationBell";
import { useT } from "@/i18n/locale";
import {
  LayoutGrid, Users, CreditCard, ListChecks, Inbox,
  BarChart3, Landmark, ShieldCheck, Wallet, Search, LogOut,
} from "lucide-react";

const golos = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap" });

const navItems = [
  { href: "/dashboard", labelKey: "nav.overview", icon: LayoutGrid },
  { href: "/family", labelKey: "nav.family", icon: Users },
  { href: "/cards", labelKey: "nav.cards", icon: CreditCard },
  { href: "/chores", labelKey: "nav.chores", icon: ListChecks },
  { href: "/requests", labelKey: "nav.requests", icon: Inbox },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/banks", labelKey: "nav.banks", icon: Landmark },
  { href: "/limits", labelKey: "nav.limits", icon: ShieldCheck },
  { href: "/allowance", labelKey: "nav.allowance", icon: Wallet },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, setUser, logout, user } = useAuthStore();
  const { family, setFamily, clearFamily } = useFamilyStore();
  const t = useT();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    authService.me().then(({ data }) => setUser(data.data)).catch(() => {
      logout();
      clearFamily();
      router.replace("/login");
    });
    familyService
      .getMyFamily()
      .then(({ data }) => setFamily(data.data))
      .catch(() => clearFamily());
  }, [hasHydrated, isAuthenticated, router, setUser, logout, setFamily, clearFamily]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try { await authService.logout(refreshToken); } catch { /* ignore */ }
    }
    logout();
    clearFamily();
    router.replace("/login");
  };

  if (!hasHydrated) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-[#08080f] ${golos.className}`}>
        <div className="text-white/40 text-sm animate-pulse">{t("common.loading")}</div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className={`fixed inset-0 overflow-y-auto bg-[#08080f] text-white antialiased ${golos.className}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[34rem] w-[34rem] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/10 blur-[130px]" />
      </div>

      <div className="relative flex min-h-full">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b15]/60 backdrop-blur px-3 py-5 sticky top-0 h-screen">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-2 mb-6">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-bold">K</span>
            <span className="font-semibold tracking-tight">KidsCard</span>
          </Link>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive ? "bg-white/[0.08] text-white font-medium" : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" style={isActive ? { color: "#e879f9" } : undefined} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold">ДК</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate tabular-nums">{user?.phone ?? "—"}</p>
              <p className="text-xs text-white/40 truncate">{t("common.owner")}</p>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors" title={t("common.logout")}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 sm:px-8 h-16 bg-[#08080f]/70 backdrop-blur border-b border-white/[0.04]">
            <p className="text-sm text-white/50">{t("dashboard.familyHeader", { name: family?.name ?? "—" })}</p>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 h-10 text-sm text-white/40 w-48">
                <Search className="h-4 w-4" /> {t("common.search")}
              </div>
              <NotificationBell />
            </div>
          </header>

          <main className="px-5 sm:px-8 py-7 pb-24 md:pb-10 max-w-5xl">{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0b0b15]/95 backdrop-blur border-t border-white/[0.06] flex overflow-x-auto">
        {navItems.slice(0, 6).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? "text-white" : "text-white/40"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" style={isActive ? { color: "#e879f9" } : undefined} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

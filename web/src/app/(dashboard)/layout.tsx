"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { authService, familyService } from "@/lib/api";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: "🏠" },
  { href: "/family", label: "Семья", icon: "👨‍👩‍👧" },
  { href: "/cards", label: "Карты", icon: "💳" },
  { href: "/chores", label: "Задания", icon: "🎯" },
  { href: "/transactions", label: "Операции", icon: "💸" },
  { href: "/requests", label: "Запросы", icon: "🙋" },
  { href: "/analytics", label: "Аналитика", icon: "📊" },
  { href: "/banks", label: "Банк", icon: "🏦" },
  { href: "/limits", label: "Лимиты", icon: "🛡️" },
  { href: "/allowance", label: "Карманные", icon: "🪙" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, setUser, logout, user } = useAuthStore();
  const { setFamily, clearFamily } = useFamilyStore();

  useEffect(() => {
    // Wait until the persisted auth state is restored — otherwise the initial
    // (empty) render is misread as "logged out" and bounces to /login on reload.
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Load user info
    authService.me().then(({ data }) => setUser(data.data)).catch(() => {
      logout();
      clearFamily();
      router.replace("/login");
    });
    // Centrally load the current user's family so every page reads fresh
    // data from the store (and stale data from a previous account is cleared).
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

  // While the persisted session is being restored, show a neutral splash
  // instead of flashing the login redirect.
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-muted-foreground/60 text-sm animate-pulse">Загрузка…</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border/70 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white text-lg font-bold shadow-soft">
              K
            </span>
            <span className="text-lg font-bold tracking-tight">KidsCard</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:block tabular-nums">
                {user.phone}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 flex flex-1 gap-8 py-8">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 hidden sm:block">
          <ul className="space-y-1 sticky top-24">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 sm:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-card/90 backdrop-blur-md border-t border-border/70 flex overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-w-[64px] flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className={`grid place-items-center h-7 w-7 rounded-lg text-base transition-colors ${isActive ? "bg-accent" : ""}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

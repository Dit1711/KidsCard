"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useFamilyStore } from "@/store/family";
import { authService, familyService } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: "🏠" },
  { href: "/family", label: "Семья", icon: "👨‍👩‍👧" },
  { href: "/cards", label: "Карты", icon: "💳" },
  { href: "/chores", label: "Задания", icon: "🎯" },
  { href: "/transactions", label: "Операции", icon: "💸" },
  { href: "/banks", label: "Банк", icon: "🏦" },
  { href: "/limits", label: "Контроль", icon: "🛡️" },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-300 text-sm animate-pulse">Загрузка…</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-700">💳 KidsCard</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            {user && (
              <span className="text-sm text-gray-500 hidden sm:block">{user.phone}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 flex flex-1 gap-6 py-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 hidden sm:block">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Separator className="my-4" />
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? "text-indigo-700" : "text-gray-500"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

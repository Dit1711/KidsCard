"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useChildStore } from "@/store/child";

const navItems = [
  { href: "/kid", label: "Главная", icon: "🏠" },
  { href: "/kid/shop", label: "Магазин", icon: "🛍️" },
  { href: "/kid/chores", label: "Задания", icon: "🎯" },
  { href: "/kid/goals", label: "Цели", icon: "🐷" },
];

export default function KidLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isChildAuthed, hasHydrated, displayName, logout } = useChildStore();

  useEffect(() => {
    if (hasHydrated && !isChildAuthed) router.replace("/child-login");
  }, [hasHydrated, isChildAuthed, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50">
        <p className="text-purple-300 animate-pulse">Загрузка…</p>
      </div>
    );
  }
  if (!isChildAuthed) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-50 flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <p className="text-sm text-purple-400">Привет,</p>
          <p className="text-xl font-bold text-purple-800">{displayName ?? "друг"}! 👋</p>
        </div>
        <button
          onClick={() => { logout(); router.replace("/child-login"); }}
          className="text-sm text-purple-400 hover:text-purple-600"
        >
          Выйти
        </button>
      </header>

      <main className="flex-1 px-5 pb-24 max-w-md mx-auto w-full space-y-6">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-purple-100 flex max-w-md mx-auto rounded-t-2xl shadow-lg">
        {navItems.map((item) => {
          const isActive =
            item.href === "/kid" ? pathname === "/kid" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-purple-700" : "text-purple-300"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

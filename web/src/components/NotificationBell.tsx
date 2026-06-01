"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { enablePush, pushSupported } from "@/lib/push";
import { Bell } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

export function NotificationBell() {
  const { family } = useFamilyStore();
  const familyId = family?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (pushSupported()) setPushOn(Notification.permission === "granted");
    else setPushOn(false);
  }, []);

  const handleEnablePush = async () => {
    if (!familyId) return;
    setPushBusy(true);
    const r = await enablePush(familyId);
    setPushBusy(false);
    if (r.ok) setPushOn(true);
    else if (r.reason === "denied") alert("Уведомления заблокированы в браузере. Разрешите их в настройках сайта.");
  };

  const { data: unread } = useQuery({
    queryKey: ["notif-unread", familyId],
    queryFn: async () => {
      const { data } = await notificationService.unreadCount(familyId!);
      return data.data.unread;
    },
    enabled: !!familyId,
    refetchInterval: 15_000,
  });

  const { data: items } = useQuery({
    queryKey: ["notif-list", familyId],
    queryFn: async () => {
      const { data } = await notificationService.list(familyId!, 30);
      return data.data;
    },
    enabled: !!familyId && open,
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && familyId && (unread ?? 0) > 0) {
      try {
        await notificationService.markAllRead(familyId);
        qc.invalidateQueries({ queryKey: ["notif-unread", familyId] });
      } catch {
        /* ignore */
      }
    }
  };

  if (!familyId) return null;

  const count = unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Уведомления"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-soft z-50">
          <div className="px-4 py-3 border-b border-border sticky top-0 bg-card">
            <p className="font-semibold text-sm">Уведомления</p>
          </div>
          {pushOn === false && pushSupported() && (
            <div className="px-4 py-2.5 border-b border-border bg-accent/50">
              <button
                onClick={handleEnablePush}
                disabled={pushBusy}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:opacity-80 disabled:opacity-50"
              >
                <Bell className="h-4 w-4" />
                {pushBusy ? "Включаем…" : "Включить пуш на телефон"}
              </button>
            </div>
          )}
          {pushOn === true && (
            <div className="px-4 py-2 border-b border-border text-xs text-emerald-600">
              Пуш-уведомления включены
            </div>
          )}
          {!items && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Загрузка…</p>
          )}
          {items && items.length === 0 && (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">Пока нет уведомлений</p>
          )}
          <ul>
            {items?.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 border-b last:border-0 flex gap-3 ${
                  n.isRead ? "" : "bg-indigo-50/40"
                }`}
              >
                <span className="text-xl shrink-0">{n.icon ?? "🔔"}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 break-words">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

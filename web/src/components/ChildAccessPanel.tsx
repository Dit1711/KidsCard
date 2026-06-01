"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/api";
import { DInput, DButton, DLabel } from "@/components/dark";

export function ChildAccessPanel({
  childId,
  familyId,
  childName,
}: {
  childId: string;
  familyId: string;
  childName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  const { data: access } = useQuery({
    queryKey: ["child-access", childId],
    queryFn: async () => {
      const { data } = await authService.getChildAccess(childId);
      return data.data ?? null;
    },
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      authService.createChildAccess(childId, familyId, pin, childName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-access", childId] });
      setPin("");
    },
  });

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-fuchsia-300/80 hover:text-fuchsia-300"
      >
        {open ? "▾ Вход для ребёнка" : "▸ Вход для ребёнка"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {access && (
            <div className="rounded-xl bg-white/[0.05] border border-white/10 p-3">
              <p className="text-xs text-white/40 mb-1">Код для входа ребёнка</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-fuchsia-200">
                {access.loginCode}
              </p>
              <p className="text-xs text-white/40 mt-1">
                Ребёнок входит на <span className="font-mono">/child-login</span> с этим кодом и PIN
              </p>
            </div>
          )}

          <div>
            <DLabel>{access ? "Сбросить PIN" : "Задать PIN (4–6 цифр)"}</DLabel>
            <div className="flex gap-2">
              <DInput
                type="text"
                inputMode="numeric"
                placeholder="1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="font-mono"
              />
              <DButton onClick={() => create.mutate()} disabled={pin.length < 4 || create.isPending} className="shrink-0">
                {create.isPending ? "…" : access ? "Сбросить" : "Создать"}
              </DButton>
            </div>
            {create.isError && <p className="text-xs text-rose-300 mt-1">Ошибка. Попробуйте ещё раз.</p>}
            {create.isSuccess && <p className="text-xs text-emerald-300 mt-1">Готово! Код выше, PIN сохранён.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

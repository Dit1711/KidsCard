"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-indigo-600 hover:underline"
      >
        {open ? "▾ Вход для ребёнка" : "▸ Вход для ребёнка"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {access && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
              <p className="text-xs text-gray-500 mb-1">Код для входа ребёнка</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-indigo-700">
                {access.loginCode}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ребёнок входит на <span className="font-mono">/child-login</span> с этим кодом и PIN
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">
              {access ? "Сбросить PIN" : "Задать PIN (4–6 цифр)"}
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="font-mono"
              />
              <Button
                size="sm"
                onClick={() => create.mutate()}
                disabled={pin.length < 4 || create.isPending}
              >
                {create.isPending ? "…" : access ? "Сбросить" : "Создать"}
              </Button>
            </div>
            {create.isError && (
              <p className="text-xs text-red-500">Ошибка. Попробуйте ещё раз.</p>
            )}
            {create.isSuccess && (
              <p className="text-xs text-green-600">Готово! Код выше, PIN сохранён.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

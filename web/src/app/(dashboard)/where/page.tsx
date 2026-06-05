"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { familyService, choreService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { formatSum } from "@/lib/format";
import { Panel, DSelect } from "@/components/dark";
import { ChildMap } from "@/components/ChildMap";
import { MapPin, ShoppingBag } from "lucide-react";
import { useT } from "@/i18n/locale";

export default function WherePage() {
  const { family } = useFamilyStore();
  const t = useT();
  const [picked, setPicked] = useState("");

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  const childId = picked || children?.[0]?.id || "";

  const { data: locations } = useQuery({
    queryKey: ["child-locations", childId],
    queryFn: async () => (await choreService.childLocations(family!.id, childId)).data.data,
    enabled: !!family?.id && !!childId,
    refetchInterval: 30_000,
  });

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t("nav.whereChild")}</h1>
        <p className="text-white/50">{t("cards.needFamily")}</p>
      </div>
    );
  }

  const pings = locations ?? [];
  const last = pings[0];
  const purchases = pings.filter((p) => p.kind === "PURCHASE");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPin className="h-6 w-6 text-fuchsia-300" /> {t("nav.whereChild")}
        </h1>
        <p className="text-white/50 text-sm mt-1">{t("where.subtitle")}</p>
      </div>

      {children && children.length > 0 && (
        <DSelect value={childId} onChange={(e) => setPicked(e.target.value)}>
          {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </DSelect>
      )}

      {pings.length === 0 ? (
        <Panel className="p-6 text-center">
          <MapPin className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/50 text-sm">{t("where.empty")}</p>
        </Panel>
      ) : (
        <>
          <ChildMap points={pings} fmt={formatSum} />

          {last && (
            <Panel className="p-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-500/15 text-cyan-300 shrink-0">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{t("where.lastSeen")}</p>
                <p className="text-xs text-white/40">{new Date(last.capturedAt).toLocaleString()}</p>
              </div>
            </Panel>
          )}

          {purchases.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white/50 mb-2 flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" /> {t("where.spendMap")}
              </h2>
              <div className="space-y-2">
                {purchases.map((p, i) => (
                  <Panel key={i} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{p.label ?? t("where.purchase")}</p>
                      <p className="text-xs text-white/40">{new Date(p.capturedAt).toLocaleString()}</p>
                    </div>
                    {p.amountUzs != null && (
                      <span className="text-sm font-semibold text-white/80 tabular-nums">{formatSum(p.amountUzs)}</span>
                    )}
                  </Panel>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-white/30 leading-relaxed">{t("where.privacyNote")}</p>
    </div>
  );
}

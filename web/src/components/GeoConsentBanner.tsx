"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { geoConsent, setGeoConsent, requestConsentAndReport, captureAndReport } from "@/lib/childLocation";
import { useT } from "@/i18n/locale";

/**
 * Shown in the kid cabinet. On first visit it asks the child to share location
 * with their parents (opt-in). Once granted, every app open sends one ping.
 */
export function GeoConsentBanner() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const c = geoConsent();
    if (c === "granted") captureAndReport("APP_OPEN");
    else if (c === null) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
      <div className="flex-1">
        <p className="text-sm font-medium">{t("kidgeo.title")}</p>
        <p className="mt-0.5 text-xs text-white/50">{t("kidgeo.hint")}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => { requestConsentAndReport(); setShow(false); }}
            className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-white"
          >
            {t("kidgeo.yes")}
          </button>
          <button
            onClick={() => { setGeoConsent("denied"); setShow(false); }}
            className="rounded-full bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white/60"
          >
            {t("kidgeo.no")}
          </button>
        </div>
      </div>
    </div>
  );
}

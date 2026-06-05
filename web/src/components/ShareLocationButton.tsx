"use client";

import { useState } from "react";
import { MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { shareLocation } from "@/lib/childLocation";
import { useT } from "@/i18n/locale";

/** Kid-initiated "share where I am" button — notifies the parent immediately. */
export function ShareLocationButton() {
  const t = useT();
  const [sharing, setSharing] = useState(false);
  const [sent, setSent] = useState(false);

  const onShare = async () => {
    setSharing(true);
    const ok = await shareLocation();
    setSharing(false);
    if (ok) {
      setSent(true);
      toast.success(t("kidgeo.shared"));
      setTimeout(() => setSent(false), 4000);
    } else {
      toast.error(t("kidgeo.shareError"));
    }
  };

  return (
    <button
      onClick={onShare}
      disabled={sharing}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/20 to-sky-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-60"
    >
      {sent ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
      {sharing ? t("kidgeo.sharing") : sent ? t("kidgeo.shared") : t("kidgeo.shareBtn")}
    </button>
  );
}

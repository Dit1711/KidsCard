// Child-side geolocation: opt-in consent + one-shot "pings" (app-open and
// purchases) so a parent can see the last known place + spend map. NOT
// continuous tracking. All fire-and-forget; failures are silently ignored.

import { childAuthService } from "@/lib/api";

const CONSENT_KEY = "kc_geo_consent"; // "granted" | "denied"

export type GeoConsent = "granted" | "denied" | null;

export function geoConsent(): GeoConsent {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(CONSENT_KEY) as GeoConsent) ?? null;
}

export function setGeoConsent(v: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* ignore */
  }
}

function report(
  pos: GeolocationPosition,
  kind: "APP_OPEN" | "PURCHASE",
  label?: string,
  amountUzs?: number,
) {
  childAuthService
    .reportLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyM: pos.coords.accuracy,
      kind,
      label,
      amountUzs,
    })
    .catch(() => {
      /* ignore */
    });
}

/** Capture + send a ping, but only if the child already consented. */
export function captureAndReport(kind: "APP_OPEN" | "PURCHASE", label?: string, amountUzs?: number) {
  if (geoConsent() !== "granted" || typeof navigator === "undefined" || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => report(pos, kind, label, amountUzs),
    () => {},
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
  );
}

/**
 * Ask for consent (the browser shows its own permission prompt). On success,
 * remember consent and send the first app-open ping; on failure, remember the
 * refusal so we don't nag again.
 */
export function requestConsentAndReport(onResolved?: (granted: boolean) => void) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    setGeoConsent("denied");
    onResolved?.(false);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setGeoConsent("granted");
      report(pos, "APP_OPEN");
      onResolved?.(true);
    },
    () => {
      setGeoConsent("denied");
      onResolved?.(false);
    },
    { enableHighAccuracy: false, timeout: 8000 },
  );
}

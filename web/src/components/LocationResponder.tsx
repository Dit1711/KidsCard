"use client";

import { useEffect } from "react";
import { childAuthService } from "@/lib/api";
import { geoConsent } from "@/lib/childLocation";

/**
 * Mounted in the kid cabinet. While the app is open and the child has consented,
 * it polls for a pending parent "where are you?" request and answers it with a
 * one-shot location. Renders nothing. Pull model — not background tracking.
 */
export function LocationResponder() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let stopped = false;

    const tick = async () => {
      if (stopped || geoConsent() !== "granted") return;
      try {
        const res = await childAuthService.pendingLocationRequest();
        const req = res.data.data;
        if (!req || req.status !== "PENDING") return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            childAuthService
              .fulfillLocationRequest(req.id, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
              .catch(() => {});
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30_000 },
        );
      } catch {
        /* ignore */
      }
    };

    const interval = setInterval(tick, 10_000);
    tick();
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}

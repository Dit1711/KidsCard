"use client";

import { useEffect, useRef } from "react";

type Point = {
  lat: number;
  lng: number;
  kind: string;
  label: string | null;
  amountUzs: number | null;
  capturedAt: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

// Load Leaflet from CDN once (no npm dep / SSR headaches). Returns window.L.
function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).L));
      if ((window as any).L) resolve((window as any).L);
      return;
    }
    const s = document.createElement("script");
    s.id = "leaflet-js";
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

/** Map of a child's location pings: last place + spend pins. */
export function ChildMap({ points, fmt }: { points: Point[]; fmt: (n: number) => string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const pointsRef = useRef<Point[]>(points);
  pointsRef.current = points;

  function render(L: any) {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const pts = pointsRef.current;
    if (pts.length === 0) return;
    const latlngs: [number, number][] = [];
    pts.forEach((p, i) => {
      const isLast = i === 0; // newest first
      const isPurchase = p.kind === "PURCHASE";
      const isShared = p.kind === "SHARED";
      const color = isLast ? "#22d3ee" : isPurchase ? "#e879f9" : isShared ? "#34d399" : "#a78bfa";
      const m = L.circleMarker([p.lat, p.lng], {
        radius: isLast ? 11 : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      });
      const when = new Date(p.capturedAt).toLocaleString();
      const title = isPurchase && p.label
        ? `${p.label}${p.amountUzs ? " · " + fmt(p.amountUzs) : ""}`
        : isLast || isShared ? "📍" : "•";
      m.bindPopup(`<b>${title}</b><br/>${when}`);
      m.addTo(layer);
      latlngs.push([p.lat, p.lng]);
    });
    if (latlngs.length === 1) map.setView(latlngs[0], 15);
    else map.fitBounds(latlngs, { padding: [30, 30] });
  }

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = L.map(elRef.current).setView([41.311, 69.24], 11); // Tashkent default
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      render(L);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const w = window as any;
    if (w.L && mapRef.current) render(w.L);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return <div ref={elRef} className="h-80 w-full overflow-hidden rounded-2xl bg-white/[0.03]" />;
}

import type { NextConfig } from "next";

// In Docker each backend is its own container (compose service name); locally
// they're all on localhost. Flip with PROXY_BACKEND=docker at build time.
//
// PROXY_BACKEND=remote routes /proxy/* to a deployed server instead (default
// https://kidscard.uz, override with REMOTE_BACKEND_URL). This lets you run the
// frontend locally with hot-reload against the live backend + real data, with
// no local backend and no deploy. The rewrite is server-side, so the browser
// stays same-origin (no CORS).
const REMOTE = process.env.PROXY_BACKEND === "remote";
const REMOTE_BACKEND_URL = process.env.REMOTE_BACKEND_URL || "https://kidscard.uz";
const DOCKER = process.env.PROXY_BACKEND === "docker";
const SERVICES: Record<string, { host: string; port: number }> = {
  auth:         { host: DOCKER ? "auth-service" : "localhost", port: 8081 },
  family:       { host: DOCKER ? "family-service" : "localhost", port: 8082 },
  card:         { host: DOCKER ? "card-service" : "localhost", port: 8083 },
  payment:      { host: DOCKER ? "payment-service" : "localhost", port: 8084 },
  openbanking:  { host: DOCKER ? "open-banking-service" : "localhost", port: 8085 },
  notification: { host: DOCKER ? "notification-service" : "localhost", port: 8086 },
  kyc:          { host: DOCKER ? "kyc-service" : "localhost", port: 8087 },
};

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small production Docker image.
  output: "standalone",

  // Proxy every /proxy/<service>/* call to the matching backend so the browser
  // only ever talks to this origin. A single tunnel (port 3000) exposes the
  // whole app — no per-service CORS or public ports.
  async rewrites() {
    if (REMOTE) {
      // Single catch-all → the deployed server's own /proxy/* router.
      return [
        { source: "/proxy/:path*", destination: `${REMOTE_BACKEND_URL}/proxy/:path*` },
      ];
    }
    return Object.entries(SERVICES).map(([name, { host, port }]) => ({
      source: `/proxy/${name}/:path*`,
      destination: `http://${host}:${port}/:path*`,
    }));
  },
};

export default nextConfig;

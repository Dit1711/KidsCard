import type { NextConfig } from "next";

// Backend service ports on the host running this dev server.
const SERVICES: Record<string, string> = {
  auth: "8081",
  family: "8082",
  card: "8083",
  payment: "8084",
  kyc: "8087",
  notification: "8086",
  openbanking: "8085",
};

const nextConfig: NextConfig = {
  // Proxy every /proxy/<service>/* call to the matching local backend so the
  // browser only ever talks to this origin. This lets a single public tunnel
  // (port 3000) expose the whole app without per-service CORS or public ports.
  async rewrites() {
    return Object.entries(SERVICES).map(([name, port]) => ({
      source: `/proxy/${name}/:path*`,
      destination: `http://localhost:${port}/:path*`,
    }));
  },
};

export default nextConfig;

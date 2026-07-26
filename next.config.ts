import type { NextConfig } from "next";

/**
 * Static export is for Cap sync / App Store (`next build` → `out/`).
 * Keep it off in `next dev` so Library / Paths / Saved resolve (export mode
 * was returning 404 for those routes in local demo).
 *
 * allowedDevOrigins: Device Lab iframes load via 127.0.0.1 while `next dev`
 * may advertise localhost — without this, Turbopack blocks /_next HMR.
 */
const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

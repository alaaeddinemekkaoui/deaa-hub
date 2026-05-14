import type { NextConfig } from "next";
import path from "node:path";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const apiOrigin = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const shouldProxyApi =
  !vercelOrigin || new URL(apiOrigin).origin !== new URL(vercelOrigin).origin;

const nextConfig: NextConfig = {
  // Drop the X-Powered-By header from all responses
  poweredByHeader: false,

  // Treat build-time type errors as hard failures
  typescript: { ignoreBuildErrors: false },

  // Keep client bundles lean when pages import large icon/chart packages.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  turbopack: {
    root: path.resolve(__dirname),
  },

  // Serve modern image formats when the browser supports them
  images: {
    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    if (!shouldProxyApi) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

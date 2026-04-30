import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const apiOrigin = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;

const nextConfig: NextConfig = {
  // Drop the X-Powered-By header from all responses
  poweredByHeader: false,

  // Treat build-time type errors as hard failures
  typescript: { ignoreBuildErrors: false },

  // Serve modern image formats when the browser supports them
  images: {
    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

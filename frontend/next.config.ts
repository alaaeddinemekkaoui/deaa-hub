import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Drop the X-Powered-By header from all responses
  poweredByHeader: false,

  // Treat build-time type errors as hard failures
  typescript: { ignoreBuildErrors: false },

  // Serve modern image formats when the browser supports them
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

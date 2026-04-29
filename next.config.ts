import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@takaki/go-design-system",
      "@vercel/analytics",
      "@supabase/ssr",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;

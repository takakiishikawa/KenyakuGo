import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@takaki/go-design-system",
      "@vercel/analytics",
      "@supabase/ssr",
    ],
  },
};

export default nextConfig;

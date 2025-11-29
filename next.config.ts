import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mysql2'],

  typescript: {
    ignoreBuildErrors: true,
  },

  // ❌ HAPUS bagian eslint karena Next.js terbaru tidak mendukung ini
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ECHOFLOW_REMOTE_PREVIEW === "1" ? ".next-remote" : ".next",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

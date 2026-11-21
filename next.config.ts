import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ECHOFLOW_REMOTE_PREVIEW === "1" ? ".next-remote" : ".next",
  turbopack: {
    root: process.cwd(),
  },
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY!,
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: true,
    deleteAfterUpload: true,
  },
});

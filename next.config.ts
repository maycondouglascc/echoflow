import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ECHOFLOW_REMOTE_PREVIEW === "1" ? ".next-remote" : ".next",
  turbopack: {
    root: process.cwd(),
  },
};

const posthogApiKey = process.env.POSTHOG_API_KEY;
const posthogProjectId = process.env.POSTHOG_PROJECT_ID;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export default posthogApiKey && posthogProjectId && posthogHost
  ? withPostHogConfig(nextConfig, {
      personalApiKey: posthogApiKey,
      projectId: posthogProjectId,
      host: posthogHost,
      sourcemaps: {
        enabled: true,
        deleteAfterUpload: true,
      },
    })
  : nextConfig;

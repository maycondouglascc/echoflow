import { loadEnvFile } from "node:process";
import { authorizedProject, previewOrigin } from "./configure-remote-preview.mjs";

loadEnvFile(".env.remote.local");
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${authorizedProject}.supabase.co` ||
  process.env.NEXT_PUBLIC_SITE_URL !== previewOrigin
) {
  throw new Error(
    "Remote preview environment must match the authorized project and isolated origin.",
  );
}
process.argv = [
  process.argv[0],
  "next",
  "dev",
  "--webpack",
  "--hostname",
  "127.0.0.1",
  "--port",
  "4177",
];
await import("next/dist/bin/next");

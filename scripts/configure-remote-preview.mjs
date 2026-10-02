import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const authorizedProject = "hllsxshahgvdqhzxdmef";
export const previewOrigin = "http://127.0.0.1:4177";

export function previewEnvironment(projectRef, keys) {
  if (projectRef !== authorizedProject)
    throw new Error("Project is not authorized for this setup.");
  const key = keys.find((entry) => entry.name === "anon")?.api_key;
  if (!key || !/^[A-Za-z0-9._-]+$/.test(key))
    throw new Error("A valid public anon key is required.");
  return `NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${key}\nNEXT_PUBLIC_SITE_URL=${previewOrigin}\n`;
}

export function configure() {
  if (process.argv[2] !== `--confirm-project=${authorizedProject}`) {
    throw new Error("Explicit confirmation of the authorized project is required.");
  }
  const keys = JSON.parse(
    execFileSync(
      resolve("node_modules/.bin/supabase"),
      ["projects", "api-keys", "--project-ref", authorizedProject, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  );
  const contents = previewEnvironment(authorizedProject, keys);
  const file = ".env.remote.local";
  if (existsSync(file) && readFileSync(file, "utf8") !== contents) {
    throw new Error("Existing remote environment differs; refusing to overwrite it.");
  }
  if (!existsSync(file)) writeFileSync(file, contents, { mode: 0o600, flag: "wx" });
  chmodSync(file, 0o600);
  console.info(
    "Remote preview environment ready (mode 600). No server secret saved; local environment unchanged.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    configure();
  } catch {
    console.error(
      "Remote preview configuration failed. Check authorization and CLI access; no keys printed.",
    );
    process.exitCode = 1;
  }
}

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const manifest: Array<{ path: string; sha256: string; active: boolean }> = JSON.parse(
  readFileSync("assets/reference-audio/checksums.json", "utf8"),
);
const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:56321";
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("This importer only targets the isolated local Supabase stack.");
}
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const assets = manifest.map((item) => {
  const bytes = readFileSync(resolve("assets/reference-audio", item.path));
  if (digest(bytes) !== item.sha256) throw new Error(`Checksum mismatch: ${item.path}`);
  return { ...item, bytes };
});
if (dryRun) {
  console.info(`Verified ${assets.length} local files; dry run, no network or writes.`);
} else {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Local maintenance key is required; never use production credentials.");
  const client = createClient(url, key, { auth: { persistSession: false } });
  for (const asset of assets) {
    const { data, error } = await client.storage.from("phrase-audio").download(asset.path);
    if (data) {
      if (digest(new Uint8Array(await data.arrayBuffer())) !== asset.sha256) {
        throw new Error(`Existing object differs; refusing overwrite: ${asset.path}`);
      }
      continue;
    }
    if (error && !["404", "400"].includes(String((error as { statusCode?: string }).statusCode))) {
      throw new Error("Could not inspect destination; no overwrite attempted.");
    }
    const result = await client.storage.from("phrase-audio").upload(asset.path, asset.bytes, {
      upsert: false,
      contentType: asset.path.endsWith(".mp3") ? "audio/mpeg" : "audio/wav",
    });
    if (result.error) throw new Error(`Import failed: ${asset.path}`);
    const verification = await client.storage.from("phrase-audio").download(asset.path);
    if (!verification.data || digest(new Uint8Array(await verification.data.arrayBuffer())) !== asset.sha256) {
      throw new Error(`Destination checksum mismatch: ${asset.path}`);
    }
  }
  console.info(`Verified ${assets.length} private objects; no existing objects overwritten.`);
}

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const result = spawnSync("npx", ["supabase", "gen", "types", "typescript", "--local", "--schema", "public"], { encoding: "utf8" });
if (result.status !== 0 || !result.stdout.includes("export type Database")) throw new Error("Local type generation failed.");
writeFileSync("src/lib/supabase/database.types.ts", result.stdout);
console.log("Generated database types from the isolated local schema.");

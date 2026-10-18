import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const project = "hllsxshahgvdqhzxdmef";
if (process.argv[2] !== `--confirm-project=${project}`) {
  console.error("Explicit EchoFlow project confirmation required.");
  process.exit(1);
}
if (
  process.env.ECHOFLOW_FEEDBACK_SUPABASE_URL !== `https://${project}.supabase.co` ||
  process.env.NOTION_FEEDBACK_DATA_SOURCE_ID !== "173fea48-0b42-40cc-996f-14c762857aa1" ||
  !/^[A-Za-z0-9_-]+$/.test(process.env.NOTION_FEEDBACK_TOKEN ?? "")
) {
  console.error("Invalid or missing worker configuration.");
  process.exit(1);
}
const directory = mkdtempSync(join(tmpdir(), "echoflow-notion-"));
const cli = resolve("node_modules/.bin/supabase");
function invoke(args) {
  // Tool errors can echo SQL/secrets; never propagate raw stdout/stderr.
  return execFileSync(cli, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
try {
  const secret = process.env.NOTION_FEEDBACK_INVOKE_SECRET ?? randomBytes(32).toString("hex");
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error("invalid invoke secret");
  if (!process.env.NOTION_FEEDBACK_INVOKE_SECRET) {
    appendFileSync(".env.notion-worker.local", `\nNOTION_FEEDBACK_INVOKE_SECRET=${secret}\n`, {
      mode: 0o600,
    });
    chmodSync(".env.notion-worker.local", 0o600);
  }
  const environment = join(directory, "edge.env");
  writeFileSync(
    environment,
    `NOTION_FEEDBACK_TOKEN=${process.env.NOTION_FEEDBACK_TOKEN}\nNOTION_FEEDBACK_DATA_SOURCE_ID=${process.env.NOTION_FEEDBACK_DATA_SOURCE_ID}\nNOTION_FEEDBACK_INVOKE_SECRET=${secret}\n`,
    { mode: 0o600 },
  );
  invoke(["secrets", "set", "--project-ref", project, "--env-file", environment]);
  console.log("Worker secrets configured in authorized Supabase project.");
  invoke([
    "functions",
    "deploy",
    "notion-feedback",
    "--project-ref",
    project,
    "--use-api",
    "--no-verify-jwt",
  ]);
  console.log("Hosted exporter deployed.");
  const migrationFile = join(directory, "dispatch.sql");
  // Migration is apply-once, guarded by the same migration history used by CLI.
  const history = JSON.parse(
    invoke([
      "db",
      "query",
      "--linked",
      "--project-ref",
      project,
      "select version from supabase_migrations.schema_migrations where version='202610040003';",
      "--output",
      "json",
    ]),
  );
  if (!history.rows?.length) {
    writeFileSync(
      migrationFile,
      "begin;\n" +
        readFileSync("supabase/migrations/202610040003_notion_feedback_dispatch.sql", "utf8") +
        "\ninsert into supabase_migrations.schema_migrations(version,name) values('202610040003','notion_feedback_dispatch');\ncommit;\n",
      { mode: 0o600 },
    );
    invoke(["db", "query", "--linked", "--project-ref", project, "--file", migrationFile]);
  }
  const vaultFile = join(directory, "vault.sql");
  const target = `https://${project}.supabase.co/functions/v1/notion-feedback`;
  writeFileSync(
    vaultFile,
    `begin;
do $$ declare existing uuid; begin
 select id into existing from vault.secrets where name='notion_feedback_invoke_secret';
 if existing is null then perform vault.create_secret('${secret}','notion_feedback_invoke_secret');
 else perform vault.update_secret(existing,'${secret}'); end if;
 select id into existing from vault.secrets where name='notion_feedback_function_url';
 if existing is null then perform vault.create_secret('${target}','notion_feedback_function_url');
 else perform vault.update_secret(existing,'${target}'); end if;
end $$;
commit;`,
    { mode: 0o600 },
  );
  invoke(["db", "query", "--linked", "--project-ref", project, "--file", vaultFile]);
  console.log("New-feedback dispatch and minute retry enabled; temporary secret files removed.");
} catch {
  console.error(
    "Activation failed. No credentials or provider bodies printed. Completed steps are safe to resume.",
  );
  process.exitCode = 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}

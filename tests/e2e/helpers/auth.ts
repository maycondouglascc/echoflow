import { createHash } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { voiceComparisonScenario as fixture } from "../../../src/lib/fixtures/voice-comparison";

export const password = "EchoFlow-test-only-123!";
export const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (new URL(localUrl).hostname !== "127.0.0.1" || new URL(localUrl).port !== "56321")
  throw new Error("E2E requires the isolated local stack on 56321.");
export const admin = createClient(localUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false },
});
export function stableId(value: string) {
  const h = createHash("sha256").update(value).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export const audioUrl = (slug: string) => `/api/reference-audio/${stableId(slug)}`;
export const voiceComparisonScenario = {
  ...fixture,
  phrases: fixture.phrases.map((p) => ({
    ...p,
    audioVariants: p.audioVariants.map((v) => ({ ...v, src: audioUrl(v.id) })),
  })),
};

export async function ensureAccount(label = "practice") {
  const email = `${label}@example.test`;
  const list = await admin.auth.admin.listUsers();
  const existing = list.data.users.find((u) => u.email === email);
  if (existing) return { email, id: existing.id };
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user)
    throw new Error("Could not create synthetic local test user.");
  return { email, id: created.data.user.id };
}

export async function login(page: Page, label = "practice", next = "/scenarios/voice-comparison") {
  const { email } = await ensureAccount(label);
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next));
}

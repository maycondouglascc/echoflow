import { expect, test } from "@playwright/test";
import { admin, ensureAccount, login } from "./helpers/auth";

test("daily aggregates count confirmations and practice accesses without personal fields", async ({
  page,
}) => {
  const metric = async (name: string) => {
    const result = await admin
      .from("platform_metrics")
      .select("count")
      .eq("metric", name)
      .eq("day", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    if (result.error) throw new Error("Metric unavailable in local test schema.");
    return result.data?.count ?? 0;
  };
  const initial = await metric("confirmed_signups");
  await ensureAccount(`metrics-${Date.now()}`);
  expect(await metric("confirmed_signups")).toBe(initial + 1);
  const accesses = await metric("practice_accesses");
  await login(page, "metrics-practice");
  await expect.poll(() => metric("practice_accesses")).toBeGreaterThan(accesses);
  const rows = await admin.from("platform_metrics").select("*");
  expect(Object.keys(rows.data?.[0] ?? {}).sort()).toEqual(["count", "day", "metric"]);
});

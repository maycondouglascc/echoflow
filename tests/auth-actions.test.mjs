import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const mockUrl =
  "data:text/javascript," +
  encodeURIComponent(
    "export let client; export function setClient(value) { client=value; } export async function createClient() { return client; }",
  );
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/supabase/server") return { url: mockUrl, shortCircuit: true };
    if (specifier === "@/lib/auth-redirect")
      return {
        url: new URL("../src/lib/auth-redirect.ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "next/navigation") return next("next/navigation.js", context);
    return next(specifier, context);
  },
});
const { authenticate } = await import("../src/app/(auth)/actions.ts");
const { setClient } = await import(mockUrl);
hook.deregister();
function form(mode = "login") {
  const f = new FormData();
  f.set("mode", mode);
  f.set("email", "person@example.test");
  f.set("password", "test-password-123!");
  f.set("next", "/scenarios/team-meetings");
  return f;
}
function fixture(method, error, data = {}) {
  let calls = 0;
  setClient({
    auth: {
      [method]: async () => {
        calls++;
        return { error, data };
      },
    },
  });
  return () => calls;
}
test("login distinguishes invalid credentials, confirmation, throttling and service failure", async () => {
  for (const [error, expected] of [
    [{ code: "invalid_credentials", status: 400 }, /Email or password is incorrect/],
    [{ code: "email_not_confirmed", status: 400 }, /Confirm your email/],
    [{ code: "over_request_rate_limit", status: 429 }, /Too many attempts/],
    [{ code: "unexpected_failure", status: 503 }, /Authentication is unavailable/],
  ]) {
    fixture("signInWithPassword", error);
    assert.match((await authenticate({ message: "" }, form())).message, expected);
  }
});
test("unsupported modes never authenticate", async () => {
  const calls = fixture("signInWithPassword", null);
  const result = await authenticate({ message: "" }, form("forged"));
  assert.match(result.message, /Invalid authentication request/);
  assert.equal(calls(), 0);
});
test("successful password login preserves the allowed destination", async () => {
  fixture("signInWithPassword", null);
  await assert.rejects(authenticate({ message: "" }, form()), (e) =>
    e.digest.includes("/scenarios/team-meetings"),
  );
});
test("signup duplicates stay neutral and email delivery errors do not claim success", async () => {
  fixture("signUp", { code: "user_already_exists", status: 422 });
  assert.equal((await authenticate({ message: "" }, form("signup"))).success, true);
  fixture("signUp", { code: "email_address_not_authorized", status: 400 });
  const result = await authenticate({ message: "" }, form("signup"));
  assert.equal(result.success, undefined);
  assert.match(result.message, /Email delivery is unavailable/);
});
test("recovery is neutral, delivery failure is actionable, reset requires a session", async () => {
  fixture("resetPasswordForEmail", null);
  assert.equal((await authenticate({ message: "" }, form("recover"))).success, true);
  fixture("resetPasswordForEmail", { code: "over_email_send_rate_limit", status: 429 });
  assert.match((await authenticate({ message: "" }, form("recover"))).message, /Too many attempts/);
  fixture("getUser", null, { user: null });
  assert.match((await authenticate({ message: "" }, form("reset"))).message, /valid recovery link/);
});

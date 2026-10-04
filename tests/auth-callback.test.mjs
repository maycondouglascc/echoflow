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
    if (specifier === "next/server") return next("next/server.js", context);
    return next(specifier, context);
  },
});
const { GET } = await import("../src/app/auth/callback/route.ts");
const { setClient } = await import(mockUrl);
hook.deregister();
const token = "b".repeat(56);
process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.test";
function fixture(error = null) {
  const calls = [];
  setClient({
    auth: {
      verifyOtp: async (args) => {
        calls.push(args);
        return { error };
      },
      exchangeCodeForSession: async (code) => {
        calls.push({ code });
        return { error };
      },
    },
  });
  return calls;
}
async function callback(query) {
  return GET(new Request(`http://internal-listener/auth/callback?${query}`));
}
function assertPrivate(response) {
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(response.headers.get("location").includes(token), false);
}
test("recovery token uses server OTP verification without a PKCE verifier", async () => {
  const calls = fixture();
  const r = await callback(`token_hash=${token}&type=recovery&next=https://evil.example`);
  assert.deepEqual(calls, [{ token_hash: token, type: "recovery" }]);
  assert.equal(r.headers.get("location"), "https://app.example.test/login?mode=reset");
  assertPrivate(r);
});
test("signup honors only safe destinations and does not trust a recovery query", async () => {
  fixture();
  const r = await callback(
    `token_hash=${token}&type=signup&recovery=1&next=/scenarios/team-meetings`,
  );
  assert.equal(r.headers.get("location"), "https://app.example.test/scenarios/team-meetings");
  assertPrivate(r);
});
test("unsupported, malformed and ambiguous token inputs never call Auth", async () => {
  for (const query of [
    `token_hash=${token}&type=magiclink`,
    `token_hash=short&type=recovery`,
    `token_hash=${token}&type=recovery&code=code`,
  ]) {
    const calls = fixture();
    const r = await callback(query);
    assert.deepEqual(calls, []);
    assert.equal(r.headers.get("location"), "https://app.example.test/login?error=callback");
    assertPrivate(r);
  }
});
test("invalid or reused OTP rejects authentication and legacy code still works", async () => {
  fixture({ code: "otp_expired" });
  const r = await callback(`token_hash=${token}&type=recovery`);
  assert.equal(r.headers.get("location"), "https://app.example.test/login?error=callback");
  assertPrivate(r);
  const calls = fixture();
  const legacy = await callback("code=legacy-code&recovery=1");
  assert.deepEqual(calls, [{ code: "legacy-code" }]);
  assert.equal(legacy.headers.get("location"), "https://app.example.test/login?mode=reset");
  assertPrivate(legacy);
});

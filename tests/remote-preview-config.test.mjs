import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizedProject,
  previewEnvironment,
  previewOrigin,
} from "../scripts/configure-remote-preview.mjs";

test("remote preview contains only the public key and uses an isolated origin", () => {
  const value = previewEnvironment(authorizedProject, [
    { name: "service_role", api_key: "private-fixture-only" },
    { name: "anon", api_key: "public.fixture.only" },
  ]);
  assert.match(value, /NEXT_PUBLIC_SUPABASE_ANON_KEY=public\.fixture\.only/);
  assert.ok(value.includes(previewOrigin));
  assert.ok(!value.includes("SERVICE_ROLE") && !value.includes("private-fixture-only"));
  assert.ok(!value.includes(":4175") && !value.includes(":56321"));
});
test("foreign projects and secret-only responses are refused", () => {
  assert.throws(() =>
    previewEnvironment("different-project", [{ name: "anon", api_key: "fixture" }]),
  );
  assert.throws(() =>
    previewEnvironment(authorizedProject, [{ name: "service_role", api_key: "fixture" }]),
  );
});
test("keys cannot inject extra environment values", () => {
  assert.throws(() =>
    previewEnvironment(authorizedProject, [{ name: "anon", api_key: "fixture\nSECRET=leak" }]),
  );
});

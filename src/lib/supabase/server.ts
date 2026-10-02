import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createClient() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values) store.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; Proxy persists refreshed tokens.
        }
      },
    },
  });
}

export async function requireUser(next = "/home") {
  let result: Awaited<ReturnType<typeof authenticatedSession>>;
  try {
    result = await authenticatedSession();
  } catch {
    redirect(`/login?next=${encodeURIComponent(next)}&error=unavailable`);
  }
  const { client, data, error } = result;
  if (error || !data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { client, user: data.user };
}

// Render/request scoped only: never share a user's session between requests.
const authenticatedSession = cache(async () => {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  return { client, data, error };
});

export async function currentUser() {
  try {
    const { data, error } = await authenticatedSession();
    return error ? null : data.user;
  } catch {
    return null;
  }
}

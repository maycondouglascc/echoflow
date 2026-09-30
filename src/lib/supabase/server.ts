import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
  let client: Awaited<ReturnType<typeof createClient>>;
  try {
    client = await createClient();
  } catch {
    redirect(`/login?next=${encodeURIComponent(next)}&error=unavailable`);
  }
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { client, user: data.user };
}

export async function currentUser() {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}

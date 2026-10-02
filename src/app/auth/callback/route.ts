import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Use the configured public origin, not Next's internal listener/forwarded Host.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const code = url.searchParams.get("code");
  try {
    if (code) {
      const client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        const next =
          url.searchParams.get("recovery") === "1"
            ? "/login?mode=reset"
            : safeNext(url.searchParams.get("next"));
        const response = NextResponse.redirect(new URL(next, origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    }
  } catch {
    /* Recover in the login form without reflecting provider errors. */
  }
  const response = NextResponse.redirect(new URL("/login?error=callback", origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

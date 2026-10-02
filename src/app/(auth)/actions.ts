"use server";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export interface AuthResult {
  message: string;
  success?: boolean;
}
export async function authenticate(_previous: AuthResult, form: FormData): Promise<AuthResult> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const mode = String(form.get("mode") ?? "login");
  const next = safeNext(form.get("next"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && mode !== "reset")
    return { message: "Enter a valid email address." };
  if (mode !== "recover" && password.length < 8)
    return { message: "Use a password with at least 8 characters." };
  let destination: string | null = null;
  try {
    const client = await createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
    const callback = `${site}/auth/callback?next=${encodeURIComponent(next)}`;
    if (mode === "signup") {
      const result = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback },
      });
      if (
        result.error &&
        !["user_already_exists", "email_exists"].includes(result.error.code ?? "")
      )
        return { message: "Your signup request could not be completed. Please try again." };
      return {
        success: true,
        message:
          "Request received. Check your email to confirm your account, or sign in or recover access if you already registered.",
      };
    }
    if (mode === "recover") {
      const result = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${site}/auth/callback?next=/home&recovery=1`,
      });
      if (result.error)
        return { message: "The recovery request could not be sent. Please try again." };
      return {
        success: true,
        message: "If this address can receive a recovery email, instructions will arrive shortly.",
      };
    }
    if (mode === "reset") {
      const user = await client.auth.getUser();
      if (!user.data.user || user.error)
        return { message: "Open a valid recovery link before changing your password." };
      const result = await client.auth.updateUser({ password });
      if (result.error) return { message: "The password could not be changed. Please try again." };
      destination = "/home";
    } else {
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error)
        return {
          message:
            "Unable to sign in. Check your credentials and confirm your email, then try again.",
        };
      destination = next;
    }
  } catch {
    return { message: "Authentication is unavailable. Please try again shortly." };
  }
  redirect(destination ?? "/home");
}

export async function signInWithGoogle(_previous: AuthResult, form: FormData): Promise<AuthResult> {
  let destination: string | null = null;
  try {
    const client = await createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
    const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      cache: "no-store",
    });
    if (!settings.ok || !(await settings.json()).external?.google)
      return { message: "Google sign-in is unavailable. Try email or retry later." };
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${site}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
      },
    });
    if (error || !data.url)
      return { message: "Google sign-in is unavailable. Try email or retry later." };
    destination = data.url;
  } catch {
    return { message: "Google sign-in is unavailable. Try email or retry later." };
  }
  redirect(destination);
}

export async function logout(): Promise<void> {
  const client = await createClient();
  const result = await client.auth.signOut({ scope: "local" });
  if (result.error) throw new Error("Sign out failed. Please try again.");
  redirect("/login");
}

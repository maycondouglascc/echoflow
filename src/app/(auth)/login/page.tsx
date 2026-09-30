import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/auth-redirect";
import { currentUser } from "@/lib/supabase/server";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const query = await searchParams;
  if ((await currentUser()) && query.mode !== "reset") redirect(safeNext(query.next));
  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        echoflow<span aria-hidden="true">))</span>
      </Link>
      <AuthForm
        mode={query.mode === "reset" ? "reset" : "login"}
        next={safeNext(query.next)}
        initialError={Boolean(query.error)}
      />
    </main>
  );
}

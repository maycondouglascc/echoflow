import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/auth-redirect";
import { currentUser } from "@/lib/supabase/server";
export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const query = await searchParams;
  if (await currentUser()) redirect(safeNext(query.next));
  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        echoflow<span aria-hidden="true">))</span>
      </Link>
      <AuthForm mode="signup" next={safeNext(query.next)} />
    </main>
  );
}

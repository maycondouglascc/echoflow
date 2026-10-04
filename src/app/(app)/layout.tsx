import { headers } from "next/headers";
import { type ReactNode, Suspense } from "react";
import { MicrophoneOnboarding } from "@/components/MicrophoneOnboarding";
import { safeNext } from "@/lib/auth-redirect";
import { requireUser } from "@/lib/supabase/server";
import Loading from "./loading";
export const dynamic = "force-dynamic";
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <AuthenticatedArea>{children}</AuthenticatedArea>
    </Suspense>
  );
}
async function AuthenticatedArea({ children }: { children: ReactNode }) {
  const { user } = await requireUser(safeNext((await headers()).get("x-echo-path")));
  return (
    <>
      <MicrophoneOnboarding key={user.id} userId={user.id} />
      {children}
    </>
  );
}

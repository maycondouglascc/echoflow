import { headers } from "next/headers";
import type { ReactNode } from "react";
import { safeNext } from "@/lib/auth-redirect";
import { requireUser } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser(safeNext((await headers()).get("x-echo-path")));
  return children;
}

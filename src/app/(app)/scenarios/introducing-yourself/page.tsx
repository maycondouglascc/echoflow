import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
export default async function LegacyScenario() {
  await requireUser("/scenarios/voice-comparison");
  redirect("/scenarios/voice-comparison");
}

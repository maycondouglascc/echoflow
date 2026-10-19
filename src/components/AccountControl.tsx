"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { logout } from "@/app/(auth)/actions";

const posthogConfigured =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function AccountControl() {
  return (
    <form
      action={logout}
      className="account-control"
      onSubmit={() => {
        if (posthogConfigured) posthog.reset();
      }}
    >
      <button type="submit" aria-label="Log out" title="Log out">
        <Image src="/design/user.svg" width={24} height={24} alt="" />
        <span>Log out</span>
      </button>
      <Link href="/privacy" className="account-privacy">
        Privacy
      </Link>
    </form>
  );
}

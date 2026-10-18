"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

const posthogConfigured =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (posthogConfigured) posthog.captureException(error);
  }, [error]);
  return (
    <main className="auth-page">
      <div className="auth-form">
        <h1>We couldn’t load your practice</h1>
        <p>Check your connection and try again.</p>
        <button type="button" className="dark-button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

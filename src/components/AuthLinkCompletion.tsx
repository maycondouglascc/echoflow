"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { completeEmailSignIn } from "@/app/(auth)/actions";

export function AuthLinkCompletion() {
  const started = useRef(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    // Remove bearer credentials from the visible URL before any asynchronous work.
    window.history.replaceState(window.history.state, "", url.pathname);
    void completeEmailSignIn({
      accessToken: fragment.get("access_token") ?? "",
      refreshToken: fragment.get("refresh_token") ?? "",
      type: fragment.get("type") ?? "",
      next: url.searchParams.get("next") ?? "/home",
    })
      .then((result) => {
        if (result?.message) setMessage(result.message);
      })
      .catch(() => {
        setMessage("Authentication is unavailable. Please try again shortly.");
      });
  }, []);
  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        echoflow<span aria-hidden="true">))</span>
      </Link>
      <div className="auth-form">
        <h1>{message ? "Sign-in could not be completed" : "Completing sign-in"}</h1>
        <p role={message ? "alert" : "status"}>{message || "Verifying your email link…"}</p>
        {message ? <Link href="/login">Back to login</Link> : null}
      </div>
    </main>
  );
}

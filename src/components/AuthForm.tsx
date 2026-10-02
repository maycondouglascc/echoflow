"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { authenticate, signInWithGoogle } from "@/app/(auth)/actions";
import { PasswordField } from "./PasswordField";

export function AuthForm({
  mode = "signup",
  next = "/home",
  initialError = false,
  titleId,
  onModeChange,
  onRecoveryChange,
}: {
  mode?: "signup" | "login" | "reset";
  next?: string;
  initialError?: boolean;
  titleId?: string;
  onModeChange?: (mode: "signup" | "login", animate: boolean) => void;
  onRecoveryChange?: (animate: boolean) => void;
}) {
  const [recover, setRecover] = useState(false);
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(authenticate, { message: "" });
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, {
    message: "",
  });
  const effectiveMode = recover ? "recover" : mode;
  if (state.success && effectiveMode === "signup") {
    return (
      <div className="auth-form confirmation-step">
        <h1 id={titleId}>Check your email</h1>
        <p className="auth-description">
          Confirm your email address before signing in to EchoFlow.
        </p>
        <p role="status">{state.message}</p>
        <p>
          Open the confirmation link in this browser. If you do not see the email, check your spam
          folder.
        </p>
        <p>
          Already confirmed?{" "}
          {onModeChange ? (
            <button
              type="button"
              className="text-button"
              onClick={(event) => onModeChange("login", event.detail > 0)}
            >
              Log in
            </button>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="auth-form">
      <h1 id={titleId}>
        {recover
          ? "Recover your account"
          : mode === "signup"
            ? "Create your account"
            : mode === "reset"
              ? "Choose a new password"
              : "Welcome back"}
      </h1>
      <p className="auth-description">
        {mode === "signup" ? (
          <>
            Create your account to start practicing. <span className="nowrap">It’s free!</span>
          </>
        ) : recover ? (
          "We’ll email you a link to reset your password."
        ) : (
          "Find your rhythm in English again."
        )}
      </p>
      {mode !== "reset" && !recover ? (
        <>
          <form action={googleAction}>
            <input type="hidden" name="next" value={next} />
            <button className="google-button" disabled={googlePending || pending} type="submit">
              <Image src="/design/google.svg" width={18} height={18} alt="" />{" "}
              {googlePending ? "Connecting…" : "Continue with Google"}
            </button>
          </form>
          <div className="auth-divider">or</div>
        </>
      ) : null}
      <form action={action}>
        <input type="hidden" name="mode" value={effectiveMode} />
        <input type="hidden" name="next" value={next} />
        {mode !== "reset" ? (
          <label>
            Email address
            <input
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              spellCheck={false}
              autoComplete="email"
              placeholder="Enter your email address"
              required
              disabled={pending}
            />
          </label>
        ) : null}
        {!recover ? (
          <PasswordField
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={pending}
          />
        ) : null}
        <button className="dark-button" disabled={pending || googlePending} type="submit">
          {pending
            ? "Please wait…"
            : recover
              ? "Send recovery email"
              : mode === "reset"
                ? "Save password"
                : mode === "login"
                  ? "Log in"
                  : "Continue"}
        </button>
      </form>
      {state.message || googleState.message || initialError ? (
        <p role={state.success ? "status" : "alert"}>
          {state.message ||
            googleState.message ||
            "Your sign-in could not be completed. Please try again."}
        </p>
      ) : null}
      {mode === "login" ? (
        <button
          type="button"
          className="text-button"
          onClick={(event) => {
            onRecoveryChange?.(event.detail > 0);
            setRecover(!recover);
          }}
        >
          {recover ? "Back to login" : "Forgot password?"}
        </button>
      ) : null}
      <p className="auth-switch">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            {onModeChange ? (
              <button
                type="button"
                className="text-button"
                onClick={(event) => onModeChange("login", event.detail > 0)}
              >
                Log in
              </button>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
            )}
          </>
        ) : (
          <>
            New to EchoFlow?{" "}
            {onModeChange ? (
              <button
                type="button"
                className="text-button"
                onClick={(event) => onModeChange("signup", event.detail > 0)}
              >
                Sign up
              </button>
            ) : (
              <Link href="/signup">Sign up</Link>
            )}
          </>
        )}
      </p>
    </div>
  );
}

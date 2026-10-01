"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { AuthForm } from "./AuthForm";

export function AuthModal({
  label,
  className,
  initialMode = "signup",
}: {
  label: string;
  className?: string;
  initialMode?: "signup" | "login";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [mode, setMode] = useState(initialMode);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          dialog.current?.showModal();
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className="signup-dialog"
        aria-labelledby={titleId}
        onClose={() => setMode(initialMode)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not([type="hidden"]):not(:disabled), a[href]',
            ),
          );
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <AuthForm
          key={mode}
          titleId={titleId}
          mode={mode}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            dialog.current?.focus();
          }}
        />
        <button
          type="button"
          aria-label={mode === "signup" ? "Close signup" : "Close login"}
          className="close-signup"
          onClick={() => dialog.current?.close()}
        >
          <Image src="/design/close.svg" width={40} height={40} alt="" />
        </button>
      </dialog>
    </>
  );
}

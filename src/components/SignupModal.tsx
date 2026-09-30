"use client";
import Image from "next/image";
import { useId, useRef } from "react";
import { AuthForm } from "./AuthForm";

export function SignupModal({ label, className }: { label: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={dialog}
        className="signup-dialog"
        aria-labelledby={titleId}
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
        <AuthForm titleId={titleId} />
        <button
          type="button"
          aria-label="Close signup"
          className="close-signup"
          onClick={() => dialog.current?.close()}
        >
          <Image src="/design/close.svg" width={40} height={40} alt="" />
        </button>
      </dialog>
    </>
  );
}

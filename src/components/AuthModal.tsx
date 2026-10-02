"use client";
import { useId, useRef, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ModalDialog } from "./ModalDialog";

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
  const view = useRef<HTMLDivElement>(null);
  const viewAnimation = useRef<Animation | null>(null);
  const titleId = useId();
  const [mode, setMode] = useState(initialMode);
  const [formSession, setFormSession] = useState(0);
  function animateView(shouldAnimate: boolean) {
    const element = view.current;
    if (!element) return;
    const running = viewAnimation.current?.playState === "running";
    const current = getComputedStyle(element);
    const opacity = running ? current.opacity : "0.65";
    const transform = running ? current.transform : "scale(0.97)";
    viewAnimation.current?.cancel();
    if (!shouldAnimate) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewAnimation.current = element.animate(
      reduce
        ? [{ opacity }, { opacity: 1 }]
        : [
            { opacity, transform },
            { opacity: 1, transform: "none" },
          ],
      { duration: reduce ? 120 : 180, easing: current.getPropertyValue("--ease-out").trim() },
    );
  }
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(event) => {
          dialog.current?.setAttribute("data-instant", String(event.detail === 0));
          dialog.current?.showModal();
          dialog.current?.querySelector<HTMLButtonElement>(".google-button")?.focus();
        }}
      >
        {label}
      </button>
      <ModalDialog
        dialogRef={dialog}
        titleId={titleId}
        closeLabel={mode === "signup" ? "Close signup" : "Close login"}
        onClose={() => {
          viewAnimation.current?.cancel();
          setMode(initialMode);
          setFormSession((session) => session + 1);
        }}
      >
        <div ref={view} className="auth-view">
          <AuthForm
            key={`${mode}-${formSession}`}
            titleId={titleId}
            mode={mode}
            onModeChange={(nextMode, shouldAnimate) => {
              animateView(shouldAnimate);
              setMode(nextMode);
              dialog.current?.focus();
            }}
            onRecoveryChange={animateView}
          />
        </div>
      </ModalDialog>
    </>
  );
}

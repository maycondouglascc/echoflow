"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ModalDialog } from "./ModalDialog";

export function MicrophoneOnboarding({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"explain" | "requesting" | "ready" | "denied">("ready");
  const dialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const key = `echoflow-microphone-explained:${userId}`;
  const dismiss = useCallback(() => {
    sequence.current += 1;
    setStatus("ready");
    try {
      sessionStorage.setItem(key, "yes");
    } catch {
      /* Storage is optional. */
    }
  }, [key]);
  const request = useCallback(async () => {
    const id = ++sequence.current;
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission only: never start recording or keep an open microphone.
      for (const track of stream.getTracks()) track.stop();
      if (sequence.current === id) dismiss();
    } catch {
      if (sequence.current === id) setStatus("denied");
    }
  }, [dismiss]);
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(key)) setStatus("explain");
    } catch {
      setStatus("explain");
    }
    return () => {
      sequence.current += 1;
    };
  }, [key]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (status === "ready") {
      if (element.open) element.close();
    } else if (!element.open) {
      element.dataset.instant = String(
        Boolean(document.documentElement.dataset.keyboardNavigation),
      );
      element.showModal();
      element.querySelector<HTMLElement>("h1")?.focus();
    }
  }, [status]);
  return (
    <ModalDialog
      dialogRef={dialog}
      titleId={titleId}
      descriptionId={descriptionId}
      closeLabel="Close microphone setup"
      onClose={() => {
        dismiss();
        const target =
          document.querySelector<HTMLElement>("main a[href]") ??
          document.querySelector<HTMLElement>("main button:not(:disabled)");
        target?.focus();
      }}
    >
      <div className="auth-view">
        <div className="auth-form microphone-form">
          <Image
            className="microphone-mascot"
            src="/design/kitten.png"
            width={208}
            height={139}
            alt=""
          />
          <h1 id={titleId} tabIndex={-1}>
            Let’s hear your voice
          </h1>
          <p className="auth-description" id={descriptionId}>
            Enable your microphone to practice speaking and compare your voice with the reference.
          </p>
          <p className="microphone-reassurance">
            You’re in control. Recording starts only when you choose Speak. Your voice stays in this
            page and is never uploaded.
          </p>
          {status === "denied" ? (
            <p role="alert">
              You can still listen. Allow microphone access in your browser settings, then try
              again.
            </p>
          ) : null}
          <button
            className="dark-button"
            type="button"
            disabled={status === "requesting"}
            onClick={request}
          >
            {status === "requesting" ? "Waiting for permission…" : "Enable microphone"}
          </button>
          <button className="text-button" type="button" onClick={() => dialog.current?.close()}>
            Not now
          </button>
          <Link
            href="/privacy"
            onClick={() => {
              dismiss();
              dialog.current?.close();
            }}
          >
            Privacy &amp; microphone
          </Link>
        </div>
      </div>
    </ModalDialog>
  );
}

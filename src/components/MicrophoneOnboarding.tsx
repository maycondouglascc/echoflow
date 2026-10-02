"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function MicrophoneOnboarding({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"explain" | "requesting" | "ready" | "denied">("explain");
  const sequence = useRef(0);
  const key = `echoflow-microphone-explained:${userId}`;
  const request = useCallback(async () => {
    const id = ++sequence.current;
    setStatus("requesting");
    try {
      sessionStorage.setItem(key, "yes");
    } catch {
      /* Storage is optional. */
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission only: do not keep a live microphone or start recording here.
      for (const track of stream.getTracks()) track.stop();
      if (sequence.current === id) setStatus("ready");
    } catch {
      if (sequence.current === id) setStatus("denied");
    }
  }, [key]);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key)) {
        setStatus("ready");
        return;
      }
    } catch {
      /* Permission still works without session storage. */
    }
    const timer = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(key)) return;
      } catch {
        /* Storage is optional. */
      }
      void request();
    }, 300);
    return () => {
      window.clearTimeout(timer);
      sequence.current += 1;
    };
  }, [key, request]);

  return (
    <aside className="microphone-onboarding" aria-label="Microphone and privacy">
      {status !== "ready" ? (
        <div className="microphone-notice" aria-live="polite">
          <strong>Use your microphone to practice speaking</strong>
          <p>
            EchoFlow needs microphone permission for Speak, so you can compare your voice with the
            reference. Nothing is recorded until you choose Speak. Your recordings stay in this page
            and are never uploaded.
          </p>
          {status === "denied" ? (
            <p>
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
            {status === "requesting" ? "Waiting for microphone permission…" : "Enable microphone"}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              sequence.current += 1;
              setStatus("ready");
              try {
                sessionStorage.setItem(key, "yes");
              } catch {}
            }}
          >
            Not now
          </button>
        </div>
      ) : null}
      <details className="microphone-privacy">
        <summary>Microphone &amp; privacy</summary>
        <p>
          Permission lets you record when you choose Speak. Recordings stay in page memory, are
          never uploaded and disappear when you leave or reload. The microphone is released after
          permission checking and after each take.
        </p>
        <button className="text-button" type="button" onClick={request}>
          Check microphone permission
        </button>
      </details>
    </aside>
  );
}

"use client";

import { useId } from "react";
import type { LocalRecognitionAvailability } from "@/lib/practice-transcription";

export type LivePracticeTranscriptProps = {
  availability: LocalRecognitionAvailability;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  interimText: string;
  finalText: string;
  error?: boolean;
  withReference?: boolean;
};

/** Presentation only. The practice owner scopes/clears text per attempt and owns recognition. */
export function LivePracticeTranscript({
  availability,
  enabled,
  onEnabledChange,
  interimText,
  finalText,
  error = false,
  withReference = false,
}: LivePracticeTranscriptProps) {
  const id = useId();
  const available = availability === "ready" && !withReference;
  const showText = available && enabled && !error;
  return (
    <section className="practice-live-transcript" aria-label="Live transcription" data-feedback-private>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!available && !enabled}
          aria-describedby={id}
          onChange={(event) => onEnabledChange(event.currentTarget.checked)}
        />{" "}
        Live transcription (English)
      </label>
      <p id={id}>
        Recognized words are provisional, not a pronunciation score. Text stays on this device.
      </p>
      {withReference ? (
        <p>Transcription is unavailable while recording with the reference.</p>
      ) : availability === "needs-model" ? (
        <p>
          An approved on-device English model is required. No model is downloaded automatically.
          Recording and manual Stop still work.
        </p>
      ) : availability === "unsupported" ? (
        <p>
          Local transcription is unavailable on this device. Recording and manual Stop still work.
        </p>
      ) : null}
      {error ? (
        <p role="status">Transcription stopped. Recording and manual Stop still work.</p>
      ) : null}
      {showText ? (
        <div aria-live="off">
          {finalText ? (
            <p>
              <span>Recognized</span> <span>{finalText}</span>
            </p>
          ) : null}
          {interimText ? (
            <p>
              <span>Provisional</span> <em>{interimText}</em>
            </p>
          ) : null}
          {!finalText && !interimText ? <p>Words will appear while you speak.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

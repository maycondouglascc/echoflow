"use client";

import { useShadowingPractice } from "@/components/useShadowingPractice";
import type { ScenarioFixture } from "@/lib/fixtures/introducing-yourself";

export function ShadowingPractice({ scenario }: { scenario: ScenarioFixture }) {
  const { audioRef, view, actions } = useShadowingPractice(scenario);
  const {
    phrase,
    selectedIndex,
    currentRecording,
    canRecord,
    isAudioBusy,
    isRequestingMicrophone,
    isRecording,
    elapsedMs,
    status,
    error,
    canRetryRecording,
  } = view;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <aside className="rounded-[1.75rem] border border-[#dce4dc] bg-white/80 p-5 shadow-[0_20px_70px_rgba(16,43,38,0.06)] sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#638078]">
              Your phrases
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#12332d]">
              A short introduction
            </h2>
          </div>
          <span className="rounded-full bg-[#edf4e9] px-3 py-1.5 text-xs font-semibold text-[#315e4e]">
            {scenario.phrases.length} phrases
          </span>
        </div>

        <ol className="mt-6 space-y-3">
          {scenario.phrases.map((item, index) => {
            const active = index === selectedIndex;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`Choose phrase ${index + 1}: ${item.text}`}
                  aria-pressed={active}
                  onClick={() => actions.selectPhrase(index)}
                  className={[
                    "w-full rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-[#2a7058] bg-[#eff6ed] shadow-[0_8px_22px_rgba(42,112,88,0.08)]"
                      : "border-[#e8ede7] bg-white hover:border-[#bdcec0] hover:bg-[#fafcf9]",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                        active ? "bg-[#193f34] text-white" : "bg-[#eef1ec] text-[#60736a]",
                      ].join(" ")}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium leading-6 text-[#203e37]">
                      {item.text}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center justify-between border-t border-[#e8ede7] pt-4">
          <button
            type="button"
            aria-label="Previous phrase"
            onClick={() => actions.selectPhrase(selectedIndex - 1)}
            disabled={selectedIndex === 0}
            className="rounded-full px-3 py-2 text-sm font-semibold text-[#3d5e53] transition hover:bg-[#f1f5ef] disabled:cursor-not-allowed disabled:text-[#aab8af]"
          >
            <span aria-hidden="true">←</span> Previous phrase
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#73877e]">
            Phrase {selectedIndex + 1} of {scenario.phrases.length}
          </p>
          <button
            type="button"
            aria-label="Next phrase"
            onClick={() => actions.selectPhrase(selectedIndex + 1)}
            disabled={selectedIndex === scenario.phrases.length - 1}
            className="rounded-full px-3 py-2 text-sm font-semibold text-[#3d5e53] transition hover:bg-[#f1f5ef] disabled:cursor-not-allowed disabled:text-[#aab8af]"
          >
            Next phrase <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>

      <section
        aria-labelledby="practice-title"
        className="relative overflow-hidden rounded-[1.75rem] bg-[#173d33] p-6 text-white shadow-[0_26px_80px_rgba(18,51,45,0.18)] sm:p-9"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 -top-9 size-40 rounded-full bg-[#d7ff7a]/10 blur-2xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b5d0c4]">
              Listen · repeat · compare
            </p>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#d7e7dd]">
              Local session
            </span>
          </div>
          <h2
            id="practice-title"
            className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-[#bad0c6]"
          >
            Reference phrase {String(selectedIndex + 1).padStart(2, "0")}
          </h2>
          <p className="mt-4 max-w-2xl text-3xl font-medium leading-[1.28] tracking-tight text-white sm:text-4xl">
            {phrase.text}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#d2e0d8]">
            Listen once, then say it in your own voice. Your recording stays in this page session.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={actions.listenToReference}
              disabled={isRequestingMicrophone || isRecording}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d7ff7a] px-5 py-3 text-sm font-bold text-[#173d33] transition hover:bg-[#e5ffac] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true" className="text-base">
                ▶
              </span>{" "}
              Listen to reference
            </button>
            <button
              type="button"
              onClick={actions.startRecording}
              disabled={!canRecord || isAudioBusy || isRequestingMicrophone || isRecording}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-[#ff8979]" />
              {isRequestingMicrophone
                ? "Waiting for microphone…"
                : currentRecording
                  ? "Record again"
                  : "Record"}
            </button>
            {isRecording ? (
              <button
                type="button"
                onClick={actions.stopRecording}
                className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Stop recording
              </button>
            ) : null}
          </div>

          <div className="mt-6 min-h-12">
            <p role="status" aria-live="polite" className="text-sm font-medium text-[#dce9e2]">
              {status}
            </p>
            {isRecording ? (
              <p className="mt-2 font-mono text-xs font-semibold tracking-[0.14em] text-[#d7ff7a]">
                {formatDuration(elapsedMs)} / 00:30
              </p>
            ) : null}
            {error ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p role="alert" className="max-w-xl text-sm leading-6 text-[#ffd2c9]">
                  {error}
                </p>
                {canRetryRecording ? (
                  <button
                    type="button"
                    onClick={actions.startRecording}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white underline decoration-white/50 underline-offset-4 hover:bg-white/15"
                  >
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={actions.playRecording}
              disabled={!currentRecording || isAudioBusy || isRequestingMicrophone || isRecording}
              className="min-h-11 rounded-xl border border-white/15 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/40"
            >
              Play your recording
            </button>
            <button
              type="button"
              onClick={actions.compare}
              disabled={!currentRecording || isAudioBusy || isRequestingMicrophone || isRecording}
              className="min-h-11 rounded-xl border border-white/15 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/40"
            >
              Compare
            </button>
          </div>
          <p className="mt-5 text-xs leading-5 text-[#b5cfc3]">
            Microphone access starts only when you choose Record. Nothing is uploaded or saved after
            you leave or reload this page.
          </p>
        </div>
        {/* The selected phrase remains visible beside these button-controlled clips. */}
        {/* biome-ignore lint/a11y/useMediaCaption: Reference text is rendered in the practice panel; recordings repeat that prompt. */}
        <audio
          ref={audioRef}
          preload="none"
          onEnded={actions.handleAudioEnded}
          onError={actions.handleAudioError}
          className="sr-only"
        />
      </section>
    </section>
  );
}

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `00:${String(seconds).padStart(2, "0")}`;
}

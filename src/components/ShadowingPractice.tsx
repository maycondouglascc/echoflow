"use client";
import { LayoutGroup, MotionConfig } from "motion/react";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { completePlaylist } from "@/app/(app)/actions";
import { useShadowingPractice } from "@/components/useShadowingPractice";
import type { ScenarioFixture } from "@/lib/fixtures/voice-comparison";

export function ShadowingPractice({
  scenario,
  playlistId,
  completed = false,
  account,
}: {
  scenario: ScenarioFixture;
  playlistId?: string;
  completed?: boolean;
  account?: ReactNode;
}) {
  const { audioRef, wordReplayAudioRef, view, actions } = useShadowingPractice(scenario);
  const {
    phrase,
    activeWordIndex,
    wordTimings,
    selectedIndex,
    audioModels,
    selectedModelId,
    hasRecording,
    canRecord,
    isAudioBusy,
    isRequestingMicrophone,
    isRecording,
    elapsedMs,
    status,
    error,
    canRetryRecording,
  } = view;
  const [completion, setCompletion] = useState<"idle" | "saving" | "completed" | "error">(
    completed ? "completed" : "idle",
  );
  const canComplete = view.comparedPhraseIds.length === scenario.phrases.length;
  const saveCompletion = useCallback(async () => {
    if (!playlistId || !canComplete) return;
    setCompletion("saving");
    try {
      const result = await completePlaylist(playlistId);
      setCompletion(result.ok ? "completed" : "error");
    } catch {
      setCompletion("error");
    }
  }, [playlistId, canComplete]);
  useEffect(() => {
    if (completion === "idle" && canComplete) void saveCompletion();
  }, [completion, canComplete, saveCompletion]);
  let nextWordIndex = 0;
  const selectedVoiceName =
    audioModels.find((model) => model.id === selectedModelId)?.voiceName ?? "the selected voice";
  const phraseContent = phrase.text.split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return part;
    const wordIndex = nextWordIndex++;
    const highlighted = activeWordIndex === wordIndex;
    const canReplayWord =
      Boolean(wordTimings[wordIndex]) && !isRequestingMicrophone && !isRecording;
    const text = (
      <motion.span
        animate={{ color: "#1a1e26" }}
        transition={{ color: { duration: 0.12, ease: "easeOut" } }}
        className="relative"
      >
        {part}
      </motion.span>
    );
    return (
      <motion.span
        key={wordIndex}
        data-word-index={wordIndex}
        data-highlighted={highlighted ? "true" : undefined}
        className="relative inline-block align-baseline"
      >
        {highlighted ? (
          <motion.span
            aria-hidden="true"
            data-testid="word-highlight-indicator"
            layoutId="spoken-word-highlight"
            initial={false}
            transition={{ layout: { duration: 0.18, ease: [0.77, 0, 0.175, 1] } }}
            className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 rounded-sm bg-[#77ff33]"
          />
        ) : null}
        {canReplayWord ? (
          <motion.button
            type="button"
            aria-label={`Replay word: ${part} in ${selectedVoiceName}`}
            onClick={() => actions.replayWord(wordIndex)}
            disabled={isRequestingMicrophone || isRecording}
            className="word-replay"
          >
            {text}
          </motion.button>
        ) : (
          text
        )}
      </motion.span>
    );
  });

  return (
    <section className="platform-grid">
      <aside className="platform-sidebar practice-sidebar">
        <Link href="/home" className="back-link">
          <Image src="/design/back.svg" width={24} height={24} alt="" />
          Playlists
        </Link>
        <h1>{scenario.title}</h1>
        <h2 className="up-next">Practice phrases</h2>
        <ol className="phrase-list">
          {scenario.phrases.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={`Choose phrase ${index + 1}: ${item.text}`}
                aria-pressed={index === selectedIndex}
                onClick={() => actions.selectPhrase(index)}
              >
                <span className="phrase-number">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  {item.text}
                  <span className="sr-only">{item.category}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {completion === "completed" ? <p className="completion-badge">✓ Completed</p> : null}
        {completion === "saving" ? <p aria-live="polite">Saving completion…</p> : null}
        {completion === "error" ? (
          <div className="completion-error">
            <p role="alert">Completion could not be saved. Your recordings remain in this page.</p>
            <button className="text-button" type="button" onClick={saveCompletion}>
              Try saving again
            </button>
          </div>
        ) : null}
        {account}
      </aside>
      <section aria-labelledby="practice-title" className="platform-panel practice-panel">
        <div className="practice-toolbar">
          <fieldset
            disabled={isAudioBusy || isRequestingMicrophone || isRecording}
            className="voice-toggle"
          >
            <legend className="sr-only">Reference voice</legend>
            {audioModels.map((model, index) => (
              <label key={model.id} htmlFor={`reference-model-${index}`}>
                <input
                  id={`reference-model-${index}`}
                  type="radio"
                  name="reference-model"
                  value={model.id}
                  checked={selectedModelId === model.id}
                  onChange={() => actions.selectAudioModel(model.id)}
                  aria-label={model.voiceName}
                />
                <span className="voice-pill">{model.voiceName}</span>
              </label>
            ))}
          </fieldset>
          <span className="practice-mode">Shadowing</span>
        </div>
        <h2 id="practice-title" className="sr-only">
          Reference phrase {String(selectedIndex + 1).padStart(2, "0")}
        </h2>
        <div className="transcript-area">
          <MotionConfig reducedMotion="user">
            <LayoutGroup id={`spoken-phrase-${phrase.id}`}>
              <p className="practice-transcript">{phraseContent}</p>
            </LayoutGroup>
          </MotionConfig>
        </div>
        <div className="practice-bottom">
          <div className="practice-actions">
            <div className="numbered-action">
              <span className="step-number" aria-hidden="true">
                1
              </span>
              <button
                type="button"
                aria-label="Listen to reference"
                onClick={actions.listenToReference}
                disabled={isRequestingMicrophone || isRecording}
                className="dark-button"
              >
                <Image src="/design/play.svg" width={24} height={24} alt="" />
                Play reference
              </button>
            </div>
            <div className="numbered-action">
              <span className="step-number" aria-hidden="true">
                2
              </span>
              {isRecording ? (
                <button type="button" onClick={actions.stopRecording} className="dark-button">
                  Stop recording
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={
                    isRequestingMicrophone
                      ? "Waiting for microphone…"
                      : hasRecording
                        ? "Record again"
                        : "Record"
                  }
                  onClick={actions.startRecording}
                  disabled={!canRecord || isAudioBusy || isRequestingMicrophone}
                  className="dark-button"
                >
                  <Image src="/design/speech.svg" width={24} height={24} alt="" />
                  {isRequestingMicrophone ? "Waiting…" : "Speak"}
                </button>
              )}
            </div>
            <div className="numbered-action">
              <span className="step-number" aria-hidden="true">
                3
              </span>
              <button
                type="button"
                onClick={actions.compare}
                disabled={isAudioBusy || isRequestingMicrophone || isRecording}
                className="dark-button"
              >
                <Image src="/design/ear.svg" width={24} height={24} alt="" />
                Compare
              </button>
            </div>
          </div>
          <div className="practice-feedback">
            <p role="status" aria-live="polite" className="sr-only">
              {status}
            </p>
            {isRecording ? (
              <p className="recording-clock">{formatDuration(elapsedMs)} / 00:30</p>
            ) : null}
            {error ? (
              <div>
                <p role="alert">{error}</p>
                {canRetryRecording ? (
                  <button type="button" className="text-button" onClick={actions.startRecording}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="phrase-navigation">
            <button
              type="button"
              aria-label="Next phrase"
              className="next-phrase"
              onClick={() => actions.selectPhrase(selectedIndex + 1)}
              disabled={selectedIndex === scenario.phrases.length - 1}
            >
              <Image src="/design/forward.svg" width={24} height={24} alt="" />
              Next phrase
            </button>
          </div>
        </div>
        {/* biome-ignore lint/a11y/useMediaCaption: Reference text is visible; recording repeats that prompt. */}
        <audio
          ref={audioRef}
          preload="none"
          data-testid="practice-audio"
          onEnded={actions.handleAudioEnded}
          onError={actions.handleAudioError}
          className="sr-only"
        />
        {/* biome-ignore lint/a11y/useMediaCaption: The selected reference text is visible. */}
        <audio
          ref={wordReplayAudioRef}
          preload="auto"
          data-testid="reference-word-audio"
          onEnded={actions.handleWordAudioEnded}
          onError={actions.handleWordAudioError}
          className="sr-only"
        />
      </section>
    </section>
  );
}
function formatDuration(milliseconds: number) {
  return `00:${String(Math.floor(milliseconds / 1000)).padStart(2, "0")}`;
}

"use client";
import { LayoutGroup, MotionConfig } from "motion/react";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { completePlaylist } from "@/app/(app)/actions";
import { PhrasePracticeList } from "@/components/PhrasePracticeList";
import { PracticeControls } from "@/components/PracticeControls";
import { PracticeShell } from "@/components/PracticeShell";
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
    isAudioBusy,
    isRequestingMicrophone,
    isRecording,
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
            data-feedback-action="replay-word"
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
    <PracticeShell
      sidebar={
        <>
          <Link href="/home" className="back-link">
            <Image src="/design/back.svg" width={24} height={24} alt="" />
            Playlists
          </Link>
          <h1>{scenario.title}</h1>
          <h2 className="up-next">Practice phrases</h2>
          <PhrasePracticeList
            phrases={scenario.phrases}
            selectedId={phrase.id}
            onSelect={actions.selectPhrase}
          />
          {completion === "completed" ? <p className="completion-badge">✓ Completed</p> : null}
          {completion === "saving" ? <p aria-live="polite">Saving completion…</p> : null}
          {completion === "error" ? (
            <div className="completion-error">
              <p role="alert">
                Completion could not be saved. Your recordings remain in this page.
              </p>
              <button className="text-button" type="button" onClick={saveCompletion}>
                Try saving again
              </button>
            </div>
          ) : null}
          {account}
        </>
      }
      toolbar={
        <>
          {" "}
          <div className="practice-toolbar">
            <fieldset
              disabled={isAudioBusy || isRequestingMicrophone || isRecording}
              className="voice-toggle"
            >
              <legend className="sr-only">Reference voice</legend>
              {audioModels.map((model, index) => (
                <label key={model.id} htmlFor={`reference-model-${index}`}>
                  <input
                    data-feedback-action="select-voice"
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
        </>
      }
    >
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
      <PracticeControls
        state={view}
        actions={{ ...actions, nextPhrase: () => actions.selectPhrase(selectedIndex + 1) }}
        isLastPhrase={selectedIndex === scenario.phrases.length - 1}
      />
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
    </PracticeShell>
  );
}

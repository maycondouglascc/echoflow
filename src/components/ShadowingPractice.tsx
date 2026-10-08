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
import { usePracticeHistory } from "@/components/usePracticeHistory";
import { useShadowingPractice } from "@/components/useShadowingPractice";
import type { ScenarioFixture } from "@/lib/fixtures/voice-comparison";
import type { FullReferenceEvent } from "@/lib/practice-events";
import type { PracticeHistoryInitial } from "@/lib/practice-history-core";

const unavailableHistory: PracticeHistoryInitial = {
  accountId: "00000000-0000-4000-8000-000000000000",
  counts: {},
  available: false,
};

function isHistoryEventForAccount(event: FullReferenceEvent, accountId: string) {
  return event.run.accountGeneration === accountId;
}

export function ShadowingPractice({
  scenario,
  playlistId,
  completed = false,
  account,
  history,
}: {
  scenario: ScenarioFixture;
  playlistId?: string;
  completed?: boolean;
  account?: ReactNode;
  history?: PracticeHistoryInitial;
}) {
  const historyState = usePracticeHistory(history ?? unavailableHistory);
  const onFullReferenceComplete = useCallback(
    (event: FullReferenceEvent) => {
      if (!history || !isHistoryEventForAccount(event, history.accountId)) return;
      const databasePhraseId = scenario.phrases.find(
        (item) => item.id === event.run.phraseId,
      )?.databasePhraseId;
      if (databasePhraseId) historyState.record(databasePhraseId, event.eventId);
    },
    [history, historyState.record, scenario.phrases],
  );
  const { audioRef, wordReplayAudioRef, view, actions } = useShadowingPractice(scenario, {
    accountGeneration: history?.accountId ?? "page",
    onFullReferenceComplete,
  });
  const {
    phrase,
    activeWordIndex,
    selectedIndex,
    audioModels,
    selectedModelId,
    isAudioBusy,
    isRequestingMicrophone,
    isRecording,
    learningReplays,
  } = view;
  const databasePhraseId = phrase.databasePhraseId;
  const listenedCount = databasePhraseId ? (historyState.counts[databasePhraseId] ?? 0) : 0;
  const unsavedCount = databasePhraseId ? (historyState.unsaved[databasePhraseId] ?? 0) : 0;
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
    const replay = learningReplays[wordIndex];
    const canReplayWord = Boolean(replay) && !isRequestingMicrophone && !isRecording;
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
            aria-label={`Replay ${replay?.label ?? part} in ${selectedVoiceName}`}
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
      {history ? (
        <p className="practice-listen-history" aria-live="polite">
          {listenedCount > 0 ? `Heard · ${listenedCount}` : "Not heard yet"}
          {unsavedCount > 0 ? ` · Unsaved · ${unsavedCount}` : ""}
          {unsavedCount > 0 ? (
            <button type="button" className="text-button" onClick={historyState.retry}>
              Retry history save
            </button>
          ) : null}
        </p>
      ) : null}
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

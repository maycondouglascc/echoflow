import Image from "next/image";
import type { ComparisonMode } from "@/lib/practice-events";

export interface PracticeControlsState {
  hasRecording: boolean;
  canRecord: boolean;
  isAudioBusy: boolean;
  isPlaybackActive: boolean;
  isRequestingMicrophone: boolean;
  isRecording: boolean;
  isSaving: boolean;
  elapsedMs: number;
  status: string;
  error: string | null;
  canRetryRecording: boolean;
  canRecordWithReference: boolean;
  comparisonMode: ComparisonMode;
  referenceVolume: number;
  takeVolume: number;
}
export interface PracticeControlsActions {
  listenToReference(): void;
  startRecording(): void;
  stopRecording(): void;
  playRecording(): void;
  compare(): void;
  recordWithReference(): void;
  stop(): void;
  setComparisonMode(mode: ComparisonMode): void;
  setVolumes(reference: number, take: number): void;
  nextPhrase(): void;
}
export function PracticeControls({
  state,
  actions,
  isLastPhrase,
}: {
  state: PracticeControlsState;
  actions: PracticeControlsActions;
  isLastPhrase: boolean;
}) {
  const {
    hasRecording,
    canRecord,
    isAudioBusy,
    isPlaybackActive,
    isRequestingMicrophone,
    isRecording,
    isSaving,
    elapsedMs,
    status,
    error,
    canRetryRecording,
    canRecordWithReference,
    comparisonMode,
    referenceVolume,
    takeVolume,
  } = state;
  return (
    <div className="practice-bottom">
      <div className="practice-actions">
        <div className="numbered-action">
          <span className="step-number" aria-hidden="true">
            1
          </span>
          <button
            type="button"
            data-feedback-action="listen-reference"
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
          {isRequestingMicrophone || (isRecording && !isSaving) ? (
            <button
              type="button"
              data-feedback-action="stop-recording"
              onClick={actions.stop}
              className="dark-button"
            >
              {isRequestingMicrophone ? "Cancel microphone request" : "Stop recording"}
            </button>
          ) : isSaving ? (
            <button type="button" className="dark-button" disabled>
              Saving recording…
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
              data-feedback-action="record"
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
            data-feedback-action="compare"
            onClick={actions.compare}
            disabled={isAudioBusy || isRequestingMicrophone || isRecording}
            className="dark-button"
          >
            <Image src="/design/ear.svg" width={24} height={24} alt="" />
            Compare
          </button>
        </div>
        <button
          type="button"
          data-feedback-action="play-recording"
          onClick={actions.playRecording}
          disabled={!hasRecording || isAudioBusy || isRequestingMicrophone || isRecording}
          className="dark-button"
        >
          My recording
        </button>
        <button
          type="button"
          data-feedback-action="record-with-reference"
          onClick={actions.recordWithReference}
          disabled={!canRecordWithReference || isRequestingMicrophone || isRecording}
          className="dark-button"
          aria-describedby="record-with-reference-help"
        >
          Record with reference
        </button>
      </div>
      {hasRecording ? (
        <div className="practice-comparison-options">
          <fieldset disabled={isAudioBusy || isRequestingMicrophone || isRecording}>
            <legend>Compare mode</legend>
            <label>
              <input
                type="radio"
                name="comparison-mode"
                value="sequential"
                checked={comparisonMode === "sequential"}
                onChange={() => actions.setComparisonMode("sequential")}
              />
              Sequential
            </label>
            <label>
              <input
                type="radio"
                name="comparison-mode"
                value="simultaneous"
                checked={comparisonMode === "simultaneous"}
                onChange={() => actions.setComparisonMode("simultaneous")}
              />
              Both together
            </label>
          </fieldset>
          {comparisonMode === "simultaneous" ? (
            <div className="practice-volume-controls">
              <label>
                Reference volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={referenceVolume}
                  onChange={(event) =>
                    actions.setVolumes(Number(event.currentTarget.value), takeVolume)
                  }
                  disabled={isAudioBusy || isRequestingMicrophone || isRecording}
                />
              </label>
              <label>
                My recording volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={takeVolume}
                  onChange={(event) =>
                    actions.setVolumes(referenceVolume, Number(event.currentTarget.value))
                  }
                  disabled={isAudioBusy || isRequestingMicrophone || isRecording}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
      <p id="record-with-reference-help" className="recording-privacy">
        Use headphones for Record with reference. Speakers can be picked up by your microphone;
        reference audio is never mixed digitally into your take.
      </p>
      {isPlaybackActive ? (
        <button
          type="button"
          data-feedback-action="stop-playback"
          onClick={actions.stop}
          className="dark-button"
        >
          Stop playback
        </button>
      ) : null}
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
              <button
                type="button"
                className="text-button"
                data-feedback-action="record"
                onClick={actions.startRecording}
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="phrase-navigation">
        <button
          type="button"
          data-feedback-action="next-phrase"
          aria-label="Next phrase"
          className="next-phrase"
          onClick={() => actions.nextPhrase()}
          disabled={isLastPhrase}
        >
          <Image src="/design/forward.svg" width={24} height={24} alt="" />
          Next phrase
        </button>
      </div>
    </div>
  );
}
function formatDuration(milliseconds: number) {
  return `00:${String(Math.floor(milliseconds / 1000)).padStart(2, "0")}`;
}

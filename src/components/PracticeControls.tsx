import Image from "next/image";

export interface PracticeControlsState {
  hasRecording: boolean;
  canRecord: boolean;
  isAudioBusy: boolean;
  isRequestingMicrophone: boolean;
  isRecording: boolean;
  elapsedMs: number;
  status: string;
  error: string | null;
  canRetryRecording: boolean;
}
export interface PracticeControlsActions {
  listenToReference(): void;
  startRecording(): void;
  stopRecording(): void;
  playRecording(): void;
  compare(): void;
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
    isRequestingMicrophone,
    isRecording,
    elapsedMs,
    status,
    error,
    canRetryRecording,
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
          {isRecording ? (
            <button
              type="button"
              data-feedback-action="stop-recording"
              onClick={actions.stopRecording}
              className="dark-button"
            >
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

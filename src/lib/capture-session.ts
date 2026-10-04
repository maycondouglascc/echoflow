import { watchSpeechEnd } from "./speech-end";

export type CaptureStopReason = "manual" | "silence" | "limit" | "navigation" | "unmount" | "error";
type SaveReason = "manual" | "silence" | "limit";
export interface CaptureSession {
  stop(reason: Exclude<CaptureStopReason, "error">): void;
}
interface CaptureCallbacks {
  onProgress(elapsedMs: number): void;
  onSaving(reason: SaveReason, elapsedMs: number): void;
  onSaved(blob: Blob): void;
  onError(message: string): void;
}
const LIMIT_MS = 30_000;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];

// Own all resources from recorder construction through save, failure or cancellation.
export function beginCapture(stream: MediaStream, callbacks: CaptureCallbacks): CaptureSession {
  let recorder: MediaRecorder | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let stopSpeechWatch: (() => void) | undefined;
  let released = false;
  let finished = false;
  let reason: CaptureStopReason | null = null;
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  const elapsed = () => Math.min(LIMIT_MS, Date.now() - startedAt);
  const release = () => {
    if (released) return;
    released = true;
    clearInterval(interval);
    clearTimeout(limit);
    stopSpeechWatch?.();
    for (const track of stream.getTracks()) track.stop();
  };
  const fail = (message: string) => {
    if (finished) return;
    finished = true;
    reason = "error";
    release();
    try {
      if (recorder?.state === "recording") recorder.stop();
    } catch {
      // Resources are already released even if the recorder cannot stop.
    }
    callbacks.onError(message);
  };
  const stop: CaptureSession["stop"] = (requested) => {
    if (finished || reason !== null) return;
    reason = requested;
    if (requested === "navigation" || requested === "unmount") finished = true;
    else callbacks.onSaving(requested, elapsed());
    try {
      if (recorder?.state === "recording") recorder.stop();
    } catch {
      fail("The recording could not be finished. Please try recording again.");
    } finally {
      release();
    }
  };
  try {
    const mime = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type));
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (!finished && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () =>
      fail("The microphone recording failed. Check the microphone and try again.");
    recorder.onstop = () => {
      release();
      if (finished) return;
      finished = true;
      const blob = new Blob(chunks, {
        type: recorder?.mimeType || chunks[0]?.type || "application/octet-stream",
      });
      if (blob.size === 0 || elapsed() <= 0) {
        callbacks.onError(
          "The recording was empty or could not be finished. Please try recording again.",
        );
        return;
      }
      callbacks.onSaved(blob);
    };
    recorder.start();
    callbacks.onProgress(0);
    stopSpeechWatch = watchSpeechEnd(stream, () => stop("silence"));
    interval = setInterval(() => {
      if (finished || reason !== null) return;
      const duration = elapsed();
      callbacks.onProgress(duration);
      if (duration >= LIMIT_MS) stop("limit");
    }, 1_000);
    limit = setTimeout(() => stop("limit"), LIMIT_MS);
    return { stop };
  } catch (cause) {
    finished = true;
    release();
    try {
      if (recorder?.state === "recording") recorder.stop();
    } catch {
      // Construction/start failed; always release the stream before propagating.
    }
    throw cause;
  }
}

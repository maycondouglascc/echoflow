"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhraseFixture, ScenarioFixture } from "@/lib/fixtures/introducing-yourself";

type PlaybackKind = "reference" | "recording" | "comparison-reference" | "comparison-recording";
type ReturnPhase = "idle" | "ready";
type CaptureStopReason = "manual" | "limit" | "navigation" | "unmount" | "error";
type CaptureStopRequest = Exclude<CaptureStopReason, "error">;

interface SessionRecording {
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly durationMs: number;
}

interface CaptureSession {
  readonly phraseId: string;
  readonly recorder: MediaRecorder;
  readonly stream: MediaStream;
  readonly startedAt: number;
  readonly chunks: Blob[];
  intervalId: number | null;
  limitId: number | null;
  stopReason: CaptureStopReason | null;
  tracksStopped: boolean;
}

type PracticePhase =
  | { readonly kind: "idle" }
  | { readonly kind: "waiting"; readonly phraseId: string }
  | { readonly kind: "ready" }
  | { readonly kind: "requesting"; readonly phraseId: string }
  | { readonly kind: "recording"; readonly phraseId: string; readonly elapsedMs: number }
  | {
      readonly kind: "saving";
      readonly phraseId: string;
      readonly elapsedMs: number;
      readonly reason: "manual" | "limit";
    }
  | {
      readonly kind: "playing";
      readonly phraseId: string;
      readonly playback: PlaybackKind;
      readonly returnTo: ReturnPhase;
    };

interface PracticeError {
  readonly message: string;
  readonly retryable: boolean;
}

interface PracticeState {
  readonly selectedIndex: number;
  readonly phase: PracticePhase;
  readonly recordings: Readonly<Record<string, SessionRecording>>;
  readonly status: string;
  readonly error: PracticeError | null;
}

const MAX_RECORDING_MS = 30_000;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];

function createInitialState(): PracticeState {
  return {
    selectedIndex: 0,
    phase: { kind: "idle" },
    recordings: {},
    status: "Choose a phrase and listen to its reference audio.",
    error: null,
  };
}

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `00:${String(seconds).padStart(2, "0")}`;
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

function stopSessionTracks(session: CaptureSession) {
  if (session.tracksStopped) return;
  session.tracksStopped = true;
  stopTracks(session.stream);
}

function readyPhase(phase: PracticePhase, phraseId: string): ReturnPhase {
  return phase.kind === "ready"
    ? "ready"
    : phase.kind === "playing" && phase.phraseId === phraseId && phase.returnTo === "ready"
      ? "ready"
      : "idle";
}

export function useShadowingPractice(scenario: ScenarioFixture) {
  const [state, setState] = useState(createInitialState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedPhraseIdRef = useRef(scenario.phrases[0].id);
  const phaseRef = useRef<PracticePhase>(state.phase);
  const playbackSequenceRef = useRef(0);
  const recordReadyTimerRef = useRef<number | null>(null);
  const permissionRequestRef = useRef(0);
  const captureSessionRef = useRef<CaptureSession | null>(null);
  const recordingsRef = useRef<Readonly<Record<string, SessionRecording>>>(state.recordings);

  phaseRef.current = state.phase;
  recordingsRef.current = state.recordings;

  const phrase = scenario.phrases[state.selectedIndex];
  const currentRecording = state.recordings[phrase.id];
  const phase = state.phase;
  const isAudioBusy = phase.kind === "playing";
  const isRequestingMicrophone = phase.kind === "requesting";
  const isRecording = phase.kind === "recording" || phase.kind === "saving";
  const elapsedMs = phase.kind === "recording" || phase.kind === "saving" ? phase.elapsedMs : 0;
  const canRecord =
    phase.kind === "ready" ||
    (phase.kind === "playing" && phase.phraseId === phrase.id && phase.returnTo === "ready") ||
    ((phase.kind === "requesting" || phase.kind === "recording" || phase.kind === "saving") &&
      phase.phraseId === phrase.id);

  const clearRecordReadyTimer = useCallback(() => {
    if (recordReadyTimerRef.current !== null) {
      window.clearTimeout(recordReadyTimerRef.current);
      recordReadyTimerRef.current = null;
    }
  }, []);

  const transition = useCallback(
    (nextPhase: PracticePhase, status: string, error: PracticeError | null = null) => {
      phaseRef.current = nextPhase;
      setState((current) => ({ ...current, phase: nextPhase, status, error }));
    },
    [],
  );

  const reportError = useCallback(
    (
      message: string,
      status: string,
      retryable: boolean,
      resumeAt: PracticePhase = phaseRef.current,
    ) => {
      transition(resumeAt, status, { message, retryable });
    },
    [transition],
  );

  const stopAudio = useCallback(() => {
    playbackSequenceRef.current += 1;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  const stopCapture = useCallback(
    (reason: CaptureStopRequest, session = captureSessionRef.current) => {
      if (!session || session.stopReason !== null) return;
      session.stopReason = reason;
      if (session.intervalId !== null) window.clearInterval(session.intervalId);
      if (session.limitId !== null) window.clearTimeout(session.limitId);
      session.intervalId = null;
      session.limitId = null;

      if (reason === "navigation" || reason === "unmount") {
        if (captureSessionRef.current === session) captureSessionRef.current = null;
        try {
          if (session.recorder.state === "recording") session.recorder.stop();
        } catch {
          // Closing the stream below still releases the microphone if the recorder already stopped.
        }
        stopSessionTracks(session);
        return;
      }

      const elapsed = Math.min(MAX_RECORDING_MS, Date.now() - session.startedAt);
      const savingPhase: PracticePhase = {
        kind: "saving",
        phraseId: session.phraseId,
        elapsedMs: elapsed,
        reason,
      };
      transition(
        savingPhase,
        reason === "limit" ? "30-second limit reached. Saving recording…" : "Saving recording…",
      );
      try {
        if (session.recorder.state === "recording") session.recorder.stop();
      } catch {
        session.stopReason = "error";
        stopSessionTracks(session);
        if (captureSessionRef.current === session) captureSessionRef.current = null;
        reportError(
          "The recording could not be finished. Please try recording again.",
          "Recording failed.",
          true,
          { kind: "ready" },
        );
      }
    },
    [reportError, transition],
  );

  const playSource = useCallback(
    async (source: string, playback: PlaybackKind, phraseId: string, returnTo: ReturnPhase) => {
      const audio = audioRef.current;
      if (!audio) return;
      clearRecordReadyTimer();
      const sequence = playbackSequenceRef.current + 1;
      playbackSequenceRef.current = sequence;
      const playingPhase: PracticePhase = {
        kind: "playing",
        phraseId,
        playback,
        returnTo,
      };
      transition(
        playingPhase,
        playback === "recording" || playback === "comparison-recording"
          ? "Playing your recording."
          : "Playing reference audio.",
      );
      audio.pause();
      audio.src = source;
      audio.load();
      try {
        await audio.play();
      } catch {
        if (playbackSequenceRef.current !== sequence) return;
        playbackSequenceRef.current += 1;
        reportError(
          playback === "recording" || playback === "comparison-recording"
            ? "Your recording could not be played. Try recording again."
            : "The reference audio could not be played. You can try it again.",
          "Audio could not be played.",
          playback === "recording" || playback === "comparison-recording",
          { kind: "idle" },
        );
      }
    },
    [clearRecordReadyTimer, reportError, transition],
  );

  const playReference = useCallback(
    (
      kind: "reference" | "comparison-reference",
      targetPhrase: PhraseFixture,
      returnTo: ReturnPhase,
    ) => {
      void playSource(targetPhrase.referenceAudio, kind, targetPhrase.id, returnTo);
    },
    [playSource],
  );

  const playRecordingSource = useCallback(
    (
      recording: SessionRecording,
      kind: "recording" | "comparison-recording",
      phraseId: string,
      returnTo: ReturnPhase,
    ) => {
      void playSource(recording.objectUrl, kind, phraseId, returnTo);
    },
    [playSource],
  );

  const handleAudioError = useCallback(() => {
    const active = phaseRef.current;
    if (active.kind !== "playing" || active.phraseId !== selectedPhraseIdRef.current) return;
    playbackSequenceRef.current += 1;
    clearRecordReadyTimer();
    const isRecordingPlayback =
      active.playback === "recording" || active.playback === "comparison-recording";
    reportError(
      isRecordingPlayback
        ? "Your recording could not be played. Try recording again."
        : "The reference audio was interrupted. You can try it again.",
      "Audio playback failed.",
      isRecordingPlayback,
      { kind: "idle" },
    );
  }, [clearRecordReadyTimer, reportError]);

  const handleAudioEnded = useCallback(() => {
    const active = phaseRef.current;
    if (active.kind !== "playing" || active.phraseId !== selectedPhraseIdRef.current) return;
    playbackSequenceRef.current += 1;

    if (active.playback === "reference") {
      const waitingPhase: PracticePhase = { kind: "waiting", phraseId: active.phraseId };
      transition(waitingPhase, "Reference finished. Recording will be ready in a moment.");
      clearRecordReadyTimer();
      recordReadyTimerRef.current = window.setTimeout(() => {
        const currentPhase = phaseRef.current;
        if (
          currentPhase.kind !== "waiting" ||
          currentPhase.phraseId !== active.phraseId ||
          selectedPhraseIdRef.current !== active.phraseId
        ) {
          return;
        }
        transition({ kind: "ready" }, "Reference finished. You can record now.");
      }, 300);
      return;
    }

    if (active.playback === "comparison-reference") {
      const recording = recordingsRef.current[active.phraseId];
      if (!recording) {
        reportError(
          "Your recording is no longer available. Record this phrase again to compare.",
          "Comparison is ready to try again.",
          false,
          active.returnTo === "ready" ? { kind: "ready" } : { kind: "idle" },
        );
        return;
      }
      playRecordingSource(recording, "comparison-recording", active.phraseId, active.returnTo);
      return;
    }

    transition(
      active.returnTo === "ready" ? { kind: "ready" } : { kind: "idle" },
      active.playback === "comparison-recording"
        ? "Comparison complete. You can compare again or record another take."
        : "Recording playback finished.",
    );
  }, [clearRecordReadyTimer, playRecordingSource, reportError, transition]);

  const startRecording = useCallback(async () => {
    const currentPhase = phaseRef.current;
    if (currentPhase.kind !== "ready") return;
    clearRecordReadyTimer();
    const phraseId = selectedPhraseIdRef.current;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      reportError(
        "Microphone access is unavailable in this browser. You can still listen and navigate.",
        "Microphone unavailable.",
        true,
        { kind: "ready" },
      );
      return;
    }
    if (typeof window.MediaRecorder !== "function") {
      reportError(
        "Audio recording isn't supported in this browser. You can still listen and navigate.",
        "Recording isn't supported.",
        true,
        { kind: "ready" },
      );
      return;
    }

    const requestId = permissionRequestRef.current + 1;
    permissionRequestRef.current = requestId;
    transition({ kind: "requesting", phraseId }, "Requesting microphone permission…");
    let stream: MediaStream | null = null;
    let session: CaptureSession | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (permissionRequestRef.current !== requestId || selectedPhraseIdRef.current !== phraseId) {
        stopTracks(stream);
        return;
      }

      const supportedMime = MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported?.(mime));
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      const capture: CaptureSession = {
        phraseId,
        recorder,
        stream,
        startedAt: Date.now(),
        chunks: [],
        intervalId: null,
        limitId: null,
        stopReason: null,
        tracksStopped: false,
      };
      session = capture;
      captureSessionRef.current = capture;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) session?.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (session?.stopReason === "navigation" || session?.stopReason === "unmount") return;
        if (!session) return;
        session.stopReason = "error";
        if (session.intervalId !== null) window.clearInterval(session.intervalId);
        if (session.limitId !== null) window.clearTimeout(session.limitId);
        stopSessionTracks(session);
        if (captureSessionRef.current === session) captureSessionRef.current = null;
        if (selectedPhraseIdRef.current !== phraseId) return;
        reportError(
          "The microphone recording failed. Check the microphone and try again.",
          "Recording failed.",
          true,
          { kind: "ready" },
        );
      };
      recorder.onstop = () => {
        if (!session) return;
        stopSessionTracks(session);
        if (captureSessionRef.current === session) captureSessionRef.current = null;
        if (
          session.stopReason === "navigation" ||
          session.stopReason === "unmount" ||
          session.stopReason === "error"
        ) {
          return;
        }
        if (selectedPhraseIdRef.current !== phraseId) return;

        const durationMs = Math.min(MAX_RECORDING_MS, Date.now() - session.startedAt);
        const mimeType = recorder.mimeType || session.chunks[0]?.type || "application/octet-stream";
        const blob = new Blob(session.chunks, { type: mimeType });
        if (blob.size === 0 || durationMs <= 0) {
          reportError(
            "The recording was empty or could not be finished. Please try recording again.",
            "Recording failed.",
            true,
            { kind: "ready" },
          );
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const previous = recordingsRef.current[phraseId];
        if (previous) URL.revokeObjectURL(previous.objectUrl);
        const recording = { blob, objectUrl, durationMs };
        const nextRecordings = { ...recordingsRef.current, [phraseId]: recording };
        recordingsRef.current = nextRecordings;
        phaseRef.current = { kind: "ready" };
        setState((current) => ({
          ...current,
          phase: { kind: "ready" },
          recordings: { ...current.recordings, [phraseId]: recording },
          status: "Recording saved in this page session. Play it back or compare.",
          error: null,
        }));
      };

      recorder.start();
      transition(
        { kind: "recording", phraseId, elapsedMs: 0 },
        "Recording your voice · 00:00 / 00:30",
      );
      capture.intervalId = window.setInterval(() => {
        if (
          captureSessionRef.current !== capture ||
          phaseRef.current.kind !== "recording" ||
          phaseRef.current.phraseId !== phraseId
        ) {
          return;
        }
        const elapsedMs = Math.min(MAX_RECORDING_MS, Date.now() - capture.startedAt);
        phaseRef.current = { kind: "recording", phraseId, elapsedMs };
        const status = `Recording your voice · ${formatDuration(elapsedMs)} / 00:30`;
        setState((current) => {
          if (current.phase.kind !== "recording" || current.phase.phraseId !== phraseId) {
            return current;
          }
          return {
            ...current,
            phase: { kind: "recording", phraseId, elapsedMs },
            status,
          };
        });
        if (elapsedMs >= MAX_RECORDING_MS) stopCapture("limit", capture);
      }, 1_000);
      capture.limitId = window.setTimeout(() => stopCapture("limit", capture), MAX_RECORDING_MS);
    } catch (cause) {
      if (session) {
        if (session.intervalId !== null) window.clearInterval(session.intervalId);
        if (session.limitId !== null) window.clearTimeout(session.limitId);
        session.stopReason = "error";
        try {
          if (session.recorder.state === "recording") session.recorder.stop();
        } catch {
          // The stream cleanup below still runs if stopping the recorder fails.
        }
        stopSessionTracks(session);
        if (captureSessionRef.current === session) captureSessionRef.current = null;
      } else if (stream) {
        stopTracks(stream);
      }
      if (permissionRequestRef.current !== requestId || selectedPhraseIdRef.current !== phraseId)
        return;

      const name = cause instanceof DOMException ? cause.name : "";
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone permission was denied. Allow microphone access in your browser settings, then try again."
          : name === "NotFoundError"
            ? "No microphone was found. Connect or enable a microphone, then try again."
            : "Microphone access failed. Check the browser permission and try again.";
      reportError(message, "Microphone permission is needed to record.", true, { kind: "ready" });
    }
  }, [clearRecordReadyTimer, reportError, stopCapture, transition]);

  const selectPhrase = useCallback(
    (index: number) => {
      if (index < 0 || index >= scenario.phrases.length || index === state.selectedIndex) return;
      permissionRequestRef.current += 1;
      clearRecordReadyTimer();
      stopAudio();
      const activeCapture = captureSessionRef.current;
      if (activeCapture) stopCapture("navigation", activeCapture);
      const nextPhrase = scenario.phrases[index];
      selectedPhraseIdRef.current = nextPhrase.id;
      phaseRef.current = { kind: "idle" };
      setState((current) => ({
        ...current,
        selectedIndex: index,
        phase: { kind: "idle" },
        status: `Phrase ${index + 1} selected. Listen to the reference when you’re ready.`,
        error: null,
      }));
    },
    [clearRecordReadyTimer, scenario.phrases, state.selectedIndex, stopAudio, stopCapture],
  );

  const listenToReference = useCallback(() => {
    clearRecordReadyTimer();
    playReference("reference", phrase, "idle");
  }, [clearRecordReadyTimer, phrase, playReference]);

  const playRecording = useCallback(() => {
    if (!currentRecording || isAudioBusy || isRequestingMicrophone || isRecording) return;
    playRecordingSource(
      currentRecording,
      "recording",
      phrase.id,
      readyPhase(phaseRef.current, phrase.id),
    );
  }, [
    currentRecording,
    isAudioBusy,
    isRecording,
    isRequestingMicrophone,
    phrase.id,
    playRecordingSource,
  ]);

  const compare = useCallback(() => {
    if (!currentRecording || isAudioBusy || isRecording || isRequestingMicrophone) return;
    playReference("comparison-reference", phrase, readyPhase(phaseRef.current, phrase.id));
  }, [currentRecording, isAudioBusy, isRecording, isRequestingMicrophone, phrase, playReference]);

  useEffect(() => {
    return () => {
      clearRecordReadyTimer();
      permissionRequestRef.current += 1;
      playbackSequenceRef.current += 1;
      audioRef.current?.pause();
      const activeCapture = captureSessionRef.current;
      if (activeCapture) stopCapture("unmount", activeCapture);
      for (const recording of Object.values(recordingsRef.current)) {
        URL.revokeObjectURL(recording.objectUrl);
      }
    };
  }, [clearRecordReadyTimer, stopCapture]);

  const stopRecording = useCallback(() => stopCapture("manual"), [stopCapture]);

  return {
    audioRef,
    view: {
      phrase,
      selectedIndex: state.selectedIndex,
      currentRecording,
      canRecord,
      isAudioBusy,
      isRequestingMicrophone,
      isRecording,
      elapsedMs,
      status: state.status,
      error: state.error?.message ?? null,
      canRetryRecording: Boolean(state.error?.retryable && canRecord),
    },
    actions: {
      selectPhrase,
      listenToReference,
      startRecording,
      stopRecording,
      playRecording,
      compare,
      handleAudioEnded,
      handleAudioError,
    },
  };
}

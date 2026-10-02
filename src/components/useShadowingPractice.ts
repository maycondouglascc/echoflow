"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beginCapture, type CaptureSession, type CaptureStopReason } from "@/lib/capture-session";
import type {
  AudioVariantFixture,
  PhraseFixture,
  ScenarioFixture,
} from "@/lib/fixtures/voice-comparison";
import { useReferenceBuffer } from "./useReferenceBuffer";

type PlaybackKind =
  | "reference"
  | "recording"
  | "comparison-reference"
  | "comparison-recording"
  | "word-replay";
type ReturnPhase = "idle" | "ready";
type CaptureStopRequest = Exclude<CaptureStopReason, "error">;

interface SessionRecording {
  readonly objectUrl: string;
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
      readonly reason: "manual" | "silence" | "limit";
    }
  | ({
      readonly kind: "playing";
      readonly phraseId: string;
      readonly returnTo: ReturnPhase;
    } & (
      | { readonly playback: Exclude<PlaybackKind, "word-replay"> }
      | { readonly playback: "word-replay"; readonly endMs: number }
    ));

interface PracticeError {
  readonly message: string;
  readonly retryable: boolean;
}

interface PracticeState {
  readonly selectedIndex: number;
  readonly selectedModelId: string;
  readonly phase: PracticePhase;
  readonly recordings: Readonly<Record<string, SessionRecording>>;
  readonly status: string;
  readonly error: PracticeError | null;
}

function createInitialState(selectedModelId: string): PracticeState {
  return {
    selectedIndex: 0,
    selectedModelId,
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

function readyPhase(phase: PracticePhase, phraseId: string): ReturnPhase {
  return phase.kind === "ready"
    ? "ready"
    : phase.kind === "playing" && phase.phraseId === phraseId && phase.returnTo === "ready"
      ? "ready"
      : "idle";
}

export function useShadowingPractice(scenario: ScenarioFixture) {
  const defaultModelId = scenario.audioModels.find((model) => model.selectable)?.id ?? "";
  const [state, setState] = useState(() => createInitialState(defaultModelId));
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [comparedPhraseIds, setComparedPhraseIds] = useState<readonly string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordReplayAudioRef = useRef<HTMLAudioElement>(null);
  const selectedPhraseIdRef = useRef(scenario.phrases[0].id);
  const phaseRef = useRef<PracticePhase>(state.phase);
  const playbackSequenceRef = useRef(0);
  const recordReadyTimerRef = useRef<number | null>(null);
  const permissionRequestRef = useRef(0);
  const captureSessionRef = useRef<CaptureSession | null>(null);
  const recordingsRef = useRef<Readonly<Record<string, SessionRecording>>>(state.recordings);

  const stateRef = useRef(state);
  const updateState = useCallback(
    (update: (current: PracticeState) => PracticeState) => {
      const next = update(stateRef.current);
      stateRef.current = next;
      phaseRef.current = next.phase;
      recordingsRef.current = next.recordings;
      selectedPhraseIdRef.current = scenario.phrases[next.selectedIndex].id;
      setState(next);
    },
    [scenario.phrases],
  );

  const phrase = scenario.phrases[state.selectedIndex];
  const currentRecording = state.recordings[phrase.id];
  const selectedModel = scenario.audioModels.find(
    (model) => model.id === state.selectedModelId && model.selectable,
  );
  const selectedAudioVariant = selectedModel
    ? phrase.audioVariants.find(
        (variant) =>
          variant.modelId === selectedModel.id && variant.voiceId === selectedModel.voiceId,
      )
    : undefined;
  const selectableModels = scenario.audioModels.filter((model) => model.selectable);
  const nextVariant = scenario.phrases[state.selectedIndex + 1]?.audioVariants.find(
    (variant) => variant.modelId === selectedModel?.id && variant.voiceId === selectedModel.voiceId,
  );
  const referenceBuffer = useReferenceBuffer(
    selectedAudioVariant?.src ?? "",
    nextVariant?.src ?? "",
  );
  useEffect(() => {
    const audio = wordReplayAudioRef.current;
    if (audio && referenceBuffer.source && audio.src !== referenceBuffer.source)
      audio.src = referenceBuffer.source;
  }, [referenceBuffer.source]);
  const phase = state.phase;
  const activePlaybackKind = phase.kind === "playing" ? phase.playback : null;
  const isReferencePlayback =
    phase.kind === "playing" &&
    (phase.playback === "reference" ||
      phase.playback === "comparison-reference" ||
      phase.playback === "word-replay") &&
    phase.phraseId === phrase.id;
  const activeWordIndex = isReferencePlayback ? currentWordIndex : null;
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
      updateState((current) => ({ ...current, phase: nextPhase, status, error }));
    },
    [updateState],
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
    setCurrentWordIndex(null);
    playbackSequenceRef.current += 1;
    const audio = audioRef.current;
    wordReplayAudioRef.current?.pause();
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  const stopCapture = useCallback(
    (reason: CaptureStopRequest, session = captureSessionRef.current) => {
      if (reason === "navigation" || reason === "unmount") captureSessionRef.current = null;
      session?.stop(reason);
    },
    [],
  );

  const playSource = useCallback(
    async (
      source: string | Promise<string>,
      playback: Exclude<PlaybackKind, "word-replay">,
      phraseId: string,
      returnTo: ReturnPhase,
    ) => {
      const audio = audioRef.current;
      if (!audio) return;
      clearRecordReadyTimer();
      setCurrentWordIndex(null);
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
          : "Loading reference audio…",
      );
      audio.pause();
      wordReplayAudioRef.current?.pause();
      try {
        const resolved = await source;
        if (playbackSequenceRef.current !== sequence) return;
        audio.src = resolved;
        audio.load();
        await audio.play();
        if (playbackSequenceRef.current === sequence)
          transition(
            playingPhase,
            playback === "recording" || playback === "comparison-recording"
              ? "Playing your recording."
              : "Playing reference audio.",
          );
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
      variant: AudioVariantFixture | undefined,
      returnTo: ReturnPhase,
    ) => {
      if (!variant) {
        reportError(
          "Reference audio is unavailable for this phrase and voice. Choose another voice or try again later.",
          "Reference audio unavailable.",
          false,
          { kind: "idle" },
        );
        return;
      }
      void playSource(referenceBuffer.sourceFor(variant.src), kind, targetPhrase.id, returnTo);
    },
    [playSource, reportError, referenceBuffer.sourceFor],
  );

  const handleAudioError = useCallback(() => {
    setCurrentWordIndex(null);
    const active = phaseRef.current;
    if (
      active.kind !== "playing" ||
      active.playback === "word-replay" ||
      active.phraseId !== selectedPhraseIdRef.current
    )
      return;
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
    setCurrentWordIndex(null);
    const active = phaseRef.current;
    if (
      active.kind !== "playing" ||
      active.playback === "word-replay" ||
      active.phraseId !== selectedPhraseIdRef.current
    )
      return;
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
      void playSource(
        recording.objectUrl,
        "comparison-recording",
        active.phraseId,
        active.returnTo,
      );
      return;
    }

    if (active.playback === "comparison-recording") {
      setComparedPhraseIds((ids) =>
        ids.includes(active.phraseId) ? ids : [...ids, active.phraseId],
      );
    }
    transition(
      active.returnTo === "ready" ? { kind: "ready" } : { kind: "idle" },
      active.playback === "comparison-recording"
        ? "Comparison complete. You can compare again or record another take."
        : "Recording playback finished.",
    );
  }, [clearRecordReadyTimer, playSource, reportError, transition]);

  const handleWordAudioEnded = useCallback(() => {
    setCurrentWordIndex(null);
    const active = phaseRef.current;
    if (
      active.kind !== "playing" ||
      active.playback !== "word-replay" ||
      active.phraseId !== selectedPhraseIdRef.current
    )
      return;
    playbackSequenceRef.current += 1;
    transition(
      active.returnTo === "ready" ? { kind: "ready" } : { kind: "idle" },
      "Word replay finished.",
    );
  }, [transition]);

  const handleWordAudioError = useCallback(() => {
    setCurrentWordIndex(null);
    const active = phaseRef.current;
    if (
      active.kind !== "playing" ||
      active.playback !== "word-replay" ||
      active.phraseId !== selectedPhraseIdRef.current
    )
      return;
    playbackSequenceRef.current += 1;
    clearRecordReadyTimer();
    const resumePhase: PracticePhase =
      active.returnTo === "ready" ? { kind: "ready" } : { kind: "idle" };
    reportError(
      "The word could not be replayed. You can try it again.",
      "Word replay failed.",
      false,
      resumePhase,
    );
  }, [clearRecordReadyTimer, reportError]);

  const replayWord = useCallback(
    async (wordIndex: number) => {
      const currentPhase = phaseRef.current;
      if (
        currentPhase.kind === "requesting" ||
        currentPhase.kind === "recording" ||
        currentPhase.kind === "saving"
      )
        return;
      const cue = selectedAudioVariant?.wordTimings?.[wordIndex];
      const audio = wordReplayAudioRef.current;
      if (!cue || !audio) return;

      const requestedPhrase = phrase.id;
      const requestedSequence = ++playbackSequenceRef.current;
      try {
        const source = await referenceBuffer.sourceFor(selectedAudioVariant.src);
        if (
          selectedPhraseIdRef.current !== requestedPhrase ||
          playbackSequenceRef.current !== requestedSequence ||
          ["requesting", "recording", "saving"].includes(phaseRef.current.kind)
        )
          return;
        if (audio.src !== source) audio.src = source;
      } catch {
        if (playbackSequenceRef.current !== requestedSequence) return;
        reportError(
          "The word could not be replayed. You can try it again.",
          "Word replay failed.",
          false,
        );
        return;
      }

      clearRecordReadyTimer();
      const returnTo = readyPhase(currentPhase, phrase.id);
      const sequence = playbackSequenceRef.current + 1;
      playbackSequenceRef.current = sequence;
      audioRef.current?.pause();
      audio.pause();
      audio.currentTime = cue.startMs / 1000;
      setCurrentWordIndex(wordIndex);
      transition(
        {
          kind: "playing",
          phraseId: phrase.id,
          playback: "word-replay",
          returnTo,
          endMs: cue.endMs,
        },
        "Replaying word.",
      );
      void audio.play().catch(() => {
        if (playbackSequenceRef.current !== sequence) return;
        handleWordAudioError();
      });
    },
    [
      clearRecordReadyTimer,
      handleWordAudioError,
      phrase.id,
      selectedAudioVariant,
      transition,
      referenceBuffer.sourceFor,
      reportError,
    ],
  );

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
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (permissionRequestRef.current !== requestId || selectedPhraseIdRef.current !== phraseId) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      captureSessionRef.current = beginCapture(stream, {
        onProgress(elapsedMs) {
          if (selectedPhraseIdRef.current !== phraseId) return;
          transition(
            { kind: "recording", phraseId, elapsedMs },
            `Recording your voice · ${formatDuration(elapsedMs)} / 00:30`,
          );
        },
        onSaving(reason, elapsedMs) {
          transition(
            { kind: "saving", phraseId, reason, elapsedMs },
            reason === "limit" ? "30-second limit reached. Saving recording…" : "Saving recording…",
          );
        },
        onSaved(blob) {
          captureSessionRef.current = null;
          if (selectedPhraseIdRef.current !== phraseId) return;
          const objectUrl = URL.createObjectURL(blob);
          const previous = recordingsRef.current[phraseId];
          if (previous) URL.revokeObjectURL(previous.objectUrl);
          updateState((current) => ({
            ...current,
            phase: { kind: "ready" },
            recordings: { ...current.recordings, [phraseId]: { objectUrl } },
            status: "Recording saved in this page session. Play it back or compare.",
            error: null,
          }));
        },
        onError(message) {
          captureSessionRef.current = null;
          if (selectedPhraseIdRef.current !== phraseId) return;
          reportError(message, "Recording failed.", true, { kind: "ready" });
        },
      });
    } catch (cause) {
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
  }, [clearRecordReadyTimer, reportError, transition, updateState]);

  const selectPhrase = useCallback(
    (index: number) => {
      if (index < 0 || index >= scenario.phrases.length || index === state.selectedIndex) return;
      permissionRequestRef.current += 1;
      clearRecordReadyTimer();
      stopAudio();
      const activeCapture = captureSessionRef.current;
      if (activeCapture) stopCapture("navigation", activeCapture);
      const nextPhrase = scenario.phrases[index];
      const nextPhase: PracticePhase = recordingsRef.current[nextPhrase.id]
        ? { kind: "ready" }
        : { kind: "idle" };
      updateState((current) => ({
        ...current,
        selectedIndex: index,
        phase: nextPhase,
        status: `Phrase ${index + 1} selected. Listen to the reference when you’re ready.`,
        error: null,
      }));
    },
    [
      clearRecordReadyTimer,
      scenario.phrases,
      state.selectedIndex,
      stopAudio,
      stopCapture,
      updateState,
    ],
  );

  const selectAudioModel = useCallback(
    (modelId: string) => {
      const model = scenario.audioModels.find(
        (candidate) => candidate.id === modelId && candidate.selectable,
      );
      if (!model || modelId === state.selectedModelId) return;
      const hasEveryPhrase = scenario.phrases.every((item) =>
        item.audioVariants.some(
          (variant) => variant.modelId === model.id && variant.voiceId === model.voiceId,
        ),
      );
      const activePhase = phaseRef.current.kind;
      if (
        !hasEveryPhrase ||
        activePhase === "playing" ||
        activePhase === "requesting" ||
        activePhase === "recording" ||
        activePhase === "saving" ||
        captureSessionRef.current
      ) {
        return;
      }
      clearRecordReadyTimer();
      stopAudio();
      const nextPhase: PracticePhase =
        phaseRef.current.kind === "ready" || recordingsRef.current[selectedPhraseIdRef.current]
          ? { kind: "ready" }
          : { kind: "idle" };
      updateState((current) => ({
        ...current,
        selectedModelId: model.id,
        phase: nextPhase,
        status: `${model.voiceName} selected. Listen to the reference when you’re ready.`,
        error: null,
      }));
    },
    [
      clearRecordReadyTimer,
      scenario.audioModels,
      scenario.phrases,
      state.selectedModelId,
      stopAudio,
      updateState,
    ],
  );

  useEffect(() => {
    const audio =
      activePlaybackKind === "word-replay" ? wordReplayAudioRef.current : audioRef.current;
    const timings = selectedAudioVariant?.wordTimings ?? [];
    if (!audio || !isReferencePlayback || timings.length === 0) {
      setCurrentWordIndex(null);
      return;
    }

    let animationFrameId: number | null = null;
    let active = true;
    const syncWord = () => {
      if (audio.paused && audio.currentTime === 0) {
        setCurrentWordIndex(null);
        return;
      }
      const currentTimeMs = audio.currentTime * 1000;
      const match = timings.findIndex(
        (timing) => currentTimeMs >= timing.startMs && currentTimeMs < timing.endMs,
      );
      const nextIndex = match >= 0 ? match : null;
      setCurrentWordIndex((current) => (current === nextIndex ? current : nextIndex));
    };
    const stopAtWordEnd = () => {
      const currentPhase = phaseRef.current;
      if (
        currentPhase.kind !== "playing" ||
        currentPhase.playback !== "word-replay" ||
        audio.currentTime * 1000 < currentPhase.endMs
      )
        return false;
      playbackSequenceRef.current += 1;
      setCurrentWordIndex(null);
      transition(
        currentPhase.returnTo === "ready" ? { kind: "ready" } : { kind: "idle" },
        "Word replay finished.",
      );
      audio.pause();
      return true;
    };
    const tick = () => {
      if (!active) return;
      syncWord();
      if (stopAtWordEnd()) {
        animationFrameId = null;
        return;
      }
      if (!audio.paused && !audio.ended) animationFrameId = window.requestAnimationFrame(tick);
      else animationFrameId = null;
    };
    const start = () => {
      if (!active || animationFrameId !== null) return;
      syncWord();
      if (!audio.paused && !audio.ended) animationFrameId = window.requestAnimationFrame(tick);
    };
    const pause = () => {
      syncWord();
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    };
    const clear = () => {
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      setCurrentWordIndex(null);
    };

    audio.addEventListener("play", start);
    audio.addEventListener("playing", start);
    audio.addEventListener("timeupdate", syncWord);
    audio.addEventListener("seeked", start);
    audio.addEventListener("pause", pause);
    audio.addEventListener("ended", clear);
    audio.addEventListener("error", clear);
    start();

    return () => {
      active = false;
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      audio.removeEventListener("play", start);
      audio.removeEventListener("playing", start);
      audio.removeEventListener("timeupdate", syncWord);
      audio.removeEventListener("seeked", start);
      audio.removeEventListener("pause", pause);
      audio.removeEventListener("ended", clear);
      audio.removeEventListener("error", clear);
    };
  }, [activePlaybackKind, isReferencePlayback, selectedAudioVariant?.wordTimings, transition]);

  const listenToReference = useCallback(() => {
    clearRecordReadyTimer();
    playReference("reference", phrase, selectedAudioVariant, "idle");
  }, [clearRecordReadyTimer, phrase, playReference, selectedAudioVariant]);

  const playRecording = useCallback(() => {
    if (!currentRecording || isAudioBusy || isRequestingMicrophone || isRecording) return;
    void playSource(
      currentRecording.objectUrl,
      "recording",
      phrase.id,
      readyPhase(phaseRef.current, phrase.id),
    );
  }, [currentRecording, isAudioBusy, isRecording, isRequestingMicrophone, phrase.id, playSource]);

  const compare = useCallback(() => {
    if (isAudioBusy || isRecording || isRequestingMicrophone) return;
    if (!currentRecording) {
      reportError(
        "Choose Speak and record your voice before comparing.",
        "A recording is needed to compare.",
        false,
      );
      return;
    }
    playReference(
      "comparison-reference",
      phrase,
      selectedAudioVariant,
      readyPhase(phaseRef.current, phrase.id),
    );
  }, [
    currentRecording,
    isAudioBusy,
    isRecording,
    isRequestingMicrophone,
    phrase,
    playReference,
    selectedAudioVariant,
    reportError,
  ]);

  useEffect(() => {
    return () => {
      clearRecordReadyTimer();
      permissionRequestRef.current += 1;
      playbackSequenceRef.current += 1;
      audioRef.current?.pause();
      wordReplayAudioRef.current?.pause();
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
    wordReplayAudioRef,
    view: {
      phrase,
      comparedPhraseIds,
      activeWordIndex,
      wordTimings: selectedAudioVariant?.wordTimings ?? [],
      referenceAudioSource: referenceBuffer.source,
      selectedIndex: state.selectedIndex,
      audioModels: selectableModels,
      selectedModelId: state.selectedModelId,
      hasRecording: Boolean(currentRecording),
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
      selectAudioModel,
      listenToReference,
      startRecording,
      stopRecording,
      playRecording,
      compare,
      handleAudioEnded,
      handleAudioError,
      handleWordAudioEnded,
      handleWordAudioError,
      replayWord,
    },
  };
}

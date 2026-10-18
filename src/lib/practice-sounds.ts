export type PracticeCueKind = "ready" | "take-saved" | "playlist-completed";
export type PracticeCueEvent = { eventId: string; kind: PracticeCueKind };
export type PracticeCueState = { enabled: boolean; busy: boolean; userGesture: boolean };

const CUE_DURATION_SECONDS = 0.16;
const FREQUENCIES: Record<PracticeCueKind, number> = {
  ready: 440,
  "take-saved": 660,
  "playlist-completed": 880,
};

/** One page-local owner. No queue: a suppressed event can never play later. */
export function createPracticeCuePlayer(
  playTone?: (kind: PracticeCueKind) => (() => void) | undefined,
) {
  const seen = new Set<string>();
  let context: AudioContext | undefined;
  let cancelTone: (() => void) | undefined;
  let disposed = false;

  function stop() {
    const cancel = cancelTone;
    cancelTone = undefined;
    try {
      cancel?.();
    } catch {
      // Optional feedback must not prevent microphone or learning media cleanup.
    }
  }

  function tone(kind: PracticeCueKind) {
    // Never await resume here: a delayed sound might contaminate a new take.
    if (context?.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.value = FREQUENCIES[kind];
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.035, start + 0.01);
    gain.gain.linearRampToValueAtTime(0, start + CUE_DURATION_SECONDS);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + CUE_DURATION_SECONDS);
    return () => {
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  return {
    /** Call directly from the opt-in gesture. Failure leaves visual status intact. */
    unlock() {
      if (disposed || playTone) return;
      try {
        context ??= new AudioContext();
        void context.resume().catch(() => {});
      } catch {
        // Web Audio or autoplay may be unavailable.
      }
    },
    emitPracticeCue(event: PracticeCueEvent, state: PracticeCueState) {
      if (disposed || !event.eventId || seen.has(event.eventId)) return;
      seen.add(event.eventId);
      if (!state.enabled || state.busy || !state.userGesture) return;
      stop();
      try {
        cancelTone = (playTone ?? tone)(event.kind) ?? undefined;
      } catch {
        // Cues are always optional and never change practice state.
      }
    },
    stop,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      if (context) void context.close().catch(() => {});
      context = undefined;
      seen.clear();
    },
  };
}

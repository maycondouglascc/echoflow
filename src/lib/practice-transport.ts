export type TransportSource = "reference" | "take";
export interface PreparedAudio {
  readonly reference: AudioBuffer;
  readonly take?: AudioBuffer;
}
export interface TransportCallbacks {
  onEnded(source: TransportSource): void;
  onError(): void;
}

/** Do not allocate or publish a transport after its async request went stale. */
export function createTransportForCurrentRequest<T extends { cancel(): void }>(
  slot: { current: T | null },
  create: () => T,
  isCurrent: () => boolean,
) {
  if (!isCurrent()) return null;
  const transport = create();
  if (!isCurrent()) {
    transport.cancel();
    return null;
  }
  slot.current = transport;
  return transport;
}

// Receives only page-owned reference/take URLs. The graph has output-only gain
// paths; it never accepts a microphone stream or a recording destination.
export function createPracticeTransport(createContext = () => new AudioContext()) {
  const context = createContext();
  const controller = new AbortController();
  const nodes: AudioBufferSourceNode[] = [];
  const gains: Partial<Record<TransportSource, GainNode>> = {};
  let volumes = { reference: 0.5, take: 0.5 };
  let cancelled = false;
  let started = false;
  let referenceStart: number | null = null;
  let referenceOffsetMs = 0;
  let referenceDuration = 0;
  let referenceEnded = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    controller.abort();
    context.onstatechange = null;
    for (const node of nodes) {
      node.onended = null;
      try {
        node.stop();
      } catch {
        /* A source may already have finished. */
      }
      node.disconnect();
    }
    for (const gain of Object.values(gains)) gain.disconnect();
    if (context.state !== "closed") void context.close().catch(() => {});
  };
  const check = () => {
    if (cancelled) throw new Error("Audio playback cancelled.");
  };
  const decode = async (url: string) => {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Audio could not be loaded.");
    const bytes = await response.arrayBuffer();
    check();
    const decoded = await context.decodeAudioData(bytes);
    check();
    if (!Number.isFinite(decoded.duration) || decoded.duration <= 0)
      throw new Error("Audio is empty.");
    return decoded;
  };
  const setVolumes = (reference: number, take: number) => {
    if (!Number.isFinite(reference) || !Number.isFinite(take)) return;
    const r = Math.max(0, Math.min(1, reference));
    const t = Math.max(0, Math.min(1, take));
    const scale = Math.max(1, r + t);
    volumes = { reference: r / scale, take: t / scale };
    if (gains.reference) gains.reference.gain.value = volumes.reference;
    if (gains.take) gains.take.gain.value = volumes.take;
  };
  return {
    cancel,
    setVolumes,
    async prepare(reference: string, take?: string): Promise<PreparedAudio> {
      try {
        await context.resume();
        check();
        if (context.state !== "running") throw new Error("Synchronized audio unavailable.");
        const [referenceBuffer, takeBuffer] = await Promise.all([
          decode(reference),
          take ? decode(take) : undefined,
        ]);
        return { reference: referenceBuffer, take: takeBuffer };
      } catch (error) {
        cancel();
        throw error;
      }
    },
    // Both zero offsets for ordinary takes; reference delayed for speak-along.
    start(audio: PreparedAudio, offsetMs: number, callbacks: TransportCallbacks) {
      check();
      if (started || !Number.isFinite(offsetMs) || offsetMs < 0)
        throw new Error("Invalid playback timing.");
      started = true;
      const start = context.currentTime + 0.1;
      referenceStart = start + offsetMs / 1000;
      referenceOffsetMs = 0;
      referenceDuration = audio.reference.duration;
      context.onstatechange = () => {
        if (!cancelled && context.state !== "running") {
          cancel();
          callbacks.onError();
        }
      };
      try {
        for (const kind of ["reference", "take"] as const) {
          const buffer = audio[kind];
          if (!buffer) continue;
          const source = context.createBufferSource();
          nodes.push(source);
          const gain = context.createGain();
          gains[kind] = gain;
          source.buffer = buffer;
          source.connect(gain);
          gain.connect(context.destination);
          gain.gain.value = audio.take ? volumes[kind] : 1;
          source.onended = () => {
            if (cancelled) return;
            if (kind === "reference") referenceEnded = true;
            source.disconnect();
            gain.disconnect();
            callbacks.onEnded(kind);
          };
          source.start(kind === "reference" ? referenceStart : start);
        }
      } catch (error) {
        cancel();
        throw error;
      }
      // Estimated scheduled onset mapped to performance time, not hardware onset.
      return {
        referenceStartedAtMs: performance.now() + (referenceStart - context.currentTime) * 1000,
      };
    },
    // A reviewed contextual unit plays only its annotated range. Keep the
    // source start and duration exact; adjacent speech is never added as padding.
    startRange(
      reference: AudioBuffer,
      startMs: number,
      durationMs: number,
      callbacks: TransportCallbacks,
    ) {
      check();
      if (
        started ||
        !Number.isFinite(startMs) ||
        startMs < 0 ||
        !Number.isFinite(durationMs) ||
        durationMs <= 0 ||
        startMs + durationMs > reference.duration * 1000
      )
        throw new Error("Invalid range timing.");
      started = true;
      const start = context.currentTime + 0.1;
      referenceStart = start;
      referenceOffsetMs = startMs;
      referenceDuration = durationMs / 1000;
      context.onstatechange = () => {
        if (!cancelled && context.state !== "running") {
          cancel();
          callbacks.onError();
        }
      };
      try {
        const source = context.createBufferSource();
        nodes.push(source);
        const gain = context.createGain();
        gains.reference = gain;
        source.buffer = reference;
        source.connect(gain);
        gain.connect(context.destination);
        gain.gain.value = 1;
        source.onended = () => {
          if (cancelled) return;
          referenceEnded = true;
          source.disconnect();
          gain.disconnect();
          callbacks.onEnded("reference");
        };
        source.start(start, startMs / 1000, durationMs / 1000);
      } catch (error) {
        cancel();
        throw error;
      }
      return {
        referenceStartedAtMs: performance.now() + (start - context.currentTime) * 1000,
      };
    },
    referenceTimeMs(): number | null {
      if (
        cancelled ||
        referenceEnded ||
        referenceStart === null ||
        context.currentTime < referenceStart
      )
        return null;
      return Math.min(
        referenceOffsetMs + referenceDuration * 1000,
        referenceOffsetMs + (context.currentTime - referenceStart) * 1000,
      );
    },
  };
}
export type PracticeTransport = ReturnType<typeof createPracticeTransport>;

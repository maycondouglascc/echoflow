export type LocalRecognitionAvailability = "unsupported" | "needs-model" | "ready";
export type LocalRecognitionUnavailable =
  | LocalRecognitionAvailability
  | "opted-out"
  | "with-reference";
export type LocalRecognitionOptions = {
  attemptId: string;
  lang: "en";
  optedIn: boolean;
  mode: "repeat" | "with-reference";
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onUnavailable: (reason: LocalRecognitionUnavailable) => void;
  onError: () => void;
};

/** Trusted integration seam, never populated from UA, user input or API presence.
 * A production implementation needs the device evidence described in the feasibility note.
 * No production provider is approved yet. No browser recognizer is invoked by default.
 */
export type VerifiedLocalRecognitionProvider = {
  evidence: {
    localProcessingVerified: boolean;
    offlineVerified: boolean;
    recorderCoexistenceVerified: boolean;
    reference: string;
  };
  probe: (lang: "en") => Promise<LocalRecognitionAvailability>;
  start: (options: {
    lang: "en";
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: () => void;
  }) => { stop: () => void };
};

function verified(
  provider?: VerifiedLocalRecognitionProvider,
): provider is VerifiedLocalRecognitionProvider {
  return Boolean(
    provider?.evidence.localProcessingVerified &&
      provider.evidence.offlineVerified &&
      provider.evidence.recorderCoexistenceVerified &&
      provider.evidence.reference.trim(),
  );
}

export async function probeLocalRecognition(
  provider?: VerifiedLocalRecognitionProvider,
): Promise<LocalRecognitionAvailability> {
  if (!verified(provider)) return "unsupported";
  try {
    const result = await provider.probe("en");
    return result === "ready" || result === "needs-model" ? result : "unsupported";
  } catch {
    return "unsupported";
  }
}

export function createLocalRecognitionAdapter(provider?: VerifiedLocalRecognitionProvider) {
  let generation = 0;
  let session: { stop: () => void } | undefined;
  function stop() {
    generation++;
    const previous = session;
    session = undefined;
    try {
      previous?.stop();
    } catch {
      // Recognition failure cannot stop or break the separate recording owner.
    }
  }
  return {
    probe: () => probeLocalRecognition(provider),
    stop,
    async startLocalRecognition(options: LocalRecognitionOptions) {
      stop();
      const token = generation;
      if (!options.optedIn) return options.onUnavailable("opted-out");
      if (options.mode !== "repeat") return options.onUnavailable("with-reference");
      if (!options.attemptId || !verified(provider)) return options.onUnavailable("unsupported");
      const availability = await probeLocalRecognition(provider);
      if (token !== generation) return;
      if (availability !== "ready") return options.onUnavailable(availability);
      const live = () => token === generation;
      try {
        const started = provider.start({
          lang: options.lang,
          onInterim: (text) => {
            if (live()) options.onInterim(text);
          },
          onFinal: (text) => {
            if (live()) options.onFinal(text);
          },
          onError: () => {
            if (!live()) return;
            stop();
            options.onError();
          },
        });
        // A provider may fail synchronously while starting.
        if (live()) session = started;
        else started.stop();
      } catch {
        if (!live()) return;
        stop();
        options.onError();
      }
    },
  };
}

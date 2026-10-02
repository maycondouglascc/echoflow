interface EchoTestController {
  audioStarts: string[];
  wordReplayStarts: Array<{ source: string; startMs: number }>;
  currentAudioTimeMs: () => number | null;
  getUserMediaCalls: number;
  recorderStarts: number;
  tracksStopped: number;
  finishCurrentAudio: () => void;
  failCurrentAudio: () => void;
  denyNextMicrophone: () => void;
  setRecorderUnavailable: () => void;
  failNextRecorderStart: () => void;
  setMicrophoneUnavailable: () => void;
  setNextRecordingEmpty: () => void;
  setAudioTime: (milliseconds: number) => void;
  pauseCurrentAudio: () => void;
  resumeCurrentAudio: () => void;
  failNextReference: () => void;
  failNextRecordingPlayback: () => void;
  setMicrophoneLevel: (level: number) => void;
}

declare global {
  interface Window {
    __echoTest: EchoTestController;
  }
}

export function installMediaMocks() {
  let recorderStarts = 0;
  let microphoneLevel = 0;
  const referenceBlobs = new WeakMap<Blob, string>();
  const referenceUrls = new Map<string, string>();
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const source = String(args[0]);
    if (source.includes("/api/reference-audio/")) {
      const nativeBlob = response.blob.bind(response);
      response.blob = async () => {
        const blob = await nativeBlob();
        referenceBlobs.set(blob, new URL(source, document.baseURI).href);
        return blob;
      };
    }
    return response;
  };
  const createUrl = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    const url = createUrl(blob);
    const source = blob instanceof Blob ? referenceBlobs.get(blob) : undefined;
    if (source) referenceUrls.set(url, source);
    return url;
  };
  class FakeAudioContext {
    state = "running";
    createAnalyser() {
      return {
        fftSize: 1024,
        getFloatTimeDomainData(values: Float32Array) {
          values.fill(microphoneLevel);
        },
      };
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    async resume() {}
    async close() {
      this.state = "closed";
    }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
  const state: {
    audioStarts: string[];
    wordReplayStarts: Array<{ source: string; startMs: number }>;
    currentAudio: HTMLMediaElement | null;
    getUserMediaCalls: number;
    tracksStopped: number;
    denyMicrophone: boolean;
    recorderUnavailable: boolean;
    failRecorderStart: boolean;
    microphoneUnavailable: boolean;
    nextRecordingEmpty: boolean;
    failReference: boolean;
    failRecordingPlayback: boolean;
    marker: string;
    activeRecorder: { stop: () => void } | null;
  } = {
    audioStarts: [],
    wordReplayStarts: [],
    currentAudio: null,
    getUserMediaCalls: 0,
    tracksStopped: 0,
    denyMicrophone: false,
    recorderUnavailable: false,
    failRecorderStart: false,
    microphoneUnavailable: false,
    nextRecordingEmpty: false,
    failReference: false,
    failRecordingPlayback: false,
    marker: "echoflow-test-audio-marker-not-a-personal-recording",
    activeRecorder: null,
  };

  const mockedAudioSources = new WeakMap<HTMLMediaElement, string>();
  const mockedAudioTimes = new WeakMap<HTMLMediaElement, number>();
  const mockedAudioPaused = new WeakMap<HTMLMediaElement, boolean>();

  Object.defineProperty(window, "__echoTest", {
    configurable: true,
    value: {
      get audioStarts() {
        return state.audioStarts;
      },
      get wordReplayStarts() {
        return state.wordReplayStarts;
      },
      currentAudioTimeMs() {
        return state.currentAudio ? state.currentAudio.currentTime * 1000 : null;
      },
      get getUserMediaCalls() {
        return state.getUserMediaCalls;
      },
      get recorderStarts() {
        return recorderStarts;
      },
      get tracksStopped() {
        return state.tracksStopped;
      },
      finishCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently playing");
        const audio = state.currentAudio;
        state.currentAudio = null;
        mockedAudioPaused.set(audio, true);
        audio.dispatchEvent(new Event("ended"));
      },
      failCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently playing");
        const audio = state.currentAudio;
        state.currentAudio = null;
        mockedAudioPaused.set(audio, true);
        audio.dispatchEvent(new Event("error"));
      },
      denyNextMicrophone() {
        state.denyMicrophone = true;
      },
      setRecorderUnavailable() {
        state.recorderUnavailable = true;
        Object.defineProperty(window, "MediaRecorder", { configurable: true, value: undefined });
      },
      failNextRecorderStart() {
        state.failRecorderStart = true;
      },
      setMicrophoneUnavailable() {
        state.microphoneUnavailable = true;
        Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
      },
      setNextRecordingEmpty() {
        state.nextRecordingEmpty = true;
      },
      setAudioTime(milliseconds: number) {
        if (!state.currentAudio) throw new Error("No audio is currently loaded");
        state.currentAudio.currentTime = milliseconds / 1000;
        state.currentAudio.dispatchEvent(new Event("seeked"));
        state.currentAudio.dispatchEvent(new Event("timeupdate"));
      },
      pauseCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently loaded");
        state.currentAudio.pause();
      },
      resumeCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently loaded");
        mockedAudioPaused.set(state.currentAudio, false);
        state.currentAudio.dispatchEvent(new Event("play"));
        state.currentAudio.dispatchEvent(new Event("playing"));
      },
      failNextReference() {
        state.failReference = true;
      },
      failNextRecordingPlayback() {
        state.failRecordingPlayback = true;
      },
      setMicrophoneLevel(level: number) {
        microphoneLevel = level;
      },
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "src", {
    configurable: true,
    get(this: HTMLMediaElement) {
      const source = mockedAudioSources.get(this) ?? this.getAttribute("src");
      return source ? new URL(source, document.baseURI).href : "";
    },
    set(this: HTMLMediaElement, source: string) {
      mockedAudioSources.set(this, new URL(source, document.baseURI).href);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mockedAudioTimes.get(this) ?? 0;
    },
    set(this: HTMLMediaElement, seconds: number) {
      mockedAudioTimes.set(this, seconds);
    },
  });
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mockedAudioPaused.get(this) ?? true;
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: function (this: HTMLMediaElement) {
      const source = referenceUrls.get(this.src) ?? this.src;
      state.audioStarts.push(source);
      state.currentAudio = this;

      if (source.includes("/api/reference-audio/") && state.failReference) {
        state.failReference = false;
        state.currentAudio = null;
        return Promise.reject(new DOMException("Fixture playback failed", "NotSupportedError"));
      }
      if (source.startsWith("blob:") && state.failRecordingPlayback) {
        state.failRecordingPlayback = false;
        state.currentAudio = null;
        return Promise.reject(new DOMException("Recording playback failed", "NotSupportedError"));
      }
      if (this.dataset.testid === "reference-word-audio") {
        state.wordReplayStarts.push({ source, startMs: this.currentTime * 1000 });
      } else {
        mockedAudioTimes.set(this, 0);
      }
      mockedAudioPaused.set(this, false);
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("playing"));
      if (this.src.startsWith("blob:")) return Promise.resolve();
      return fetch(source).then((response) => {
        if (!response.ok) throw new Error(`Reference fixture returned ${response.status}`);
      });
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: function (this: HTMLMediaElement) {
      mockedAudioPaused.set(this, true);
      this.dispatchEvent(new Event("pause"));
    },
  });
  Object.defineProperty(HTMLMediaElement.prototype, "load", {
    configurable: true,
    value() {},
  });

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      async getUserMedia() {
        state.getUserMediaCalls += 1;
        if (state.microphoneUnavailable) throw new DOMException("No microphone", "NotFoundError");
        if (state.denyMicrophone) {
          state.denyMicrophone = false;
          throw new DOMException("Permission denied", "NotAllowedError");
        }
        return {
          getTracks() {
            return [
              {
                stop() {
                  state.tracksStopped += 1;
                },
              },
            ];
          },
        };
      },
    },
  });

  class FakeMediaRecorder extends EventTarget {
    state: "inactive" | "recording" = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: ((event: Event) => void) | null = null;

    constructor(_stream: unknown, _options?: { mimeType?: string }) {
      super();
      if (state.recorderUnavailable)
        throw new DOMException("Recording unavailable", "NotSupportedError");
    }

    static isTypeSupported() {
      return true;
    }

    start() {
      if (state.failRecorderStart) {
        state.failRecorderStart = false;
        throw new DOMException("Recorder could not start", "NotSupportedError");
      }
      this.state = "recording";
      recorderStarts += 1;
      state.activeRecorder = this;
    }

    stop() {
      if (this.state !== "recording") return;
      this.state = "inactive";
      state.activeRecorder = null;
      const empty = state.nextRecordingEmpty;
      state.nextRecordingEmpty = false;
      const blob = empty ? new Blob([]) : new Blob([state.marker], { type: this.mimeType });
      window.setTimeout(() => {
        const dataEvent = new Event("dataavailable");
        Object.defineProperty(dataEvent, "data", { value: blob });
        this.ondataavailable?.(dataEvent as BlobEvent);
        this.dispatchEvent(dataEvent);
        const stopEvent = new Event("stop");
        this.onstop?.(stopEvent);
        this.dispatchEvent(stopEvent);
      }, 0);
    }
  }

  Object.defineProperty(window, "MediaRecorder", {
    configurable: true,
    value: FakeMediaRecorder,
  });
}

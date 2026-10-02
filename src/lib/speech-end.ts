// Local energy detection, not recognition/transcription. No microphone data leaves the browser.
export class SpeechEndDetector {
  private voiceStarted: number | null = null;
  private lastVoice: number | null = null;
  private heardSpeech = false;
  update(rms: number, now: number): boolean {
    if (rms >= 0.02) {
      this.voiceStarted ??= now;
      this.lastVoice = now;
      if (now - this.voiceStarted >= 200) this.heardSpeech = true;
    } else {
      this.voiceStarted = null;
    }
    return this.heardSpeech && this.lastVoice !== null && now - this.lastVoice >= 1500;
  }
}

export function watchSpeechEnd(stream: MediaStream, onEnd: () => void): () => void {
  let context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let active = true;
  const cleanup = () => {
    active = false;
    if (timer) clearInterval(timer);
    source?.disconnect();
    if (context && context.state !== "closed") void context.close().catch(() => {});
  };
  try {
    context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source = context.createMediaStreamSource(stream);
    source.connect(analyser); // Never connect microphone to speakers.
    const samples = new Float32Array(analyser.fftSize);
    const detector = new SpeechEndDetector();
    void context.resume().catch(cleanup);
    timer = setInterval(() => {
      if (!active) return;
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
      );
      if (detector.update(rms, performance.now())) {
        cleanup();
        onEnd();
      }
    }, 50);
  } catch {
    cleanup();
  } // Manual stop and the 30s cap remain available.
  return cleanup;
}

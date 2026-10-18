# Local practice transcription feasibility

Assessed 2026-10-08 for feature 008. **Production support remains unavailable.** No real device, installed English model, offline recognition, system network trace or MediaRecorder coexistence trial was performed. Deterministic adapter/component tests are implementation evidence only. No provider was contacted, model installed or microphone audio processed during this assessment.

## Primary-source findings

The [Web Speech community draft](https://webaudio.github.io/web-speech-api/#dom-speechrecognition-processlocally) defines a local-processing requirement but initializes it to false. The default permits the user agent to choose remote processing. Generic recognizer API presence therefore cannot establish local privacy. Its [availability/install interfaces](https://webaudio.github.io/web-speech-api/#dom-speechrecognition-available) distinguish installed availability from downloadable/downloading models and accept an explicit local-processing option. These are draft API contracts, not proof that a particular browser/device implements them correctly.

[Microsoft Edge's first-party recognition documentation](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api) documents local-mode recognition and language-pack availability/installation alongside service-based recognition. That documentation identifies an implementation candidate for future device evaluation. It does not certify Chrome, Safari, mobile platforms or EchoFlow's simultaneous MediaRecorder use.

The draft's [privacy requirements](https://webaudio.github.io/web-speech-api/#security-and-privacy-considerations) require informed consent and visible recording indication. Its [result model](https://webaudio.github.io/web-speech-api/#speechrecognitionresult) distinguishes interim from final hypotheses. Recognition output is evidence of recognized words, not a pronunciation score.

## Delivery decision

`practice-transcription.ts` deliberately has no default browser provider and performs no API discovery, model installation, upload or network request. `probeLocalRecognition()` returns `unsupported` without a trusted provider. No user-agent string, API name or request-blocking fixture activates support. Locality, offline operation and recorder coexistence must all have a reviewed device-evidence reference before a provider can be injected by the practice owner. The injected provider is a trusted code boundary, not an authorization mechanism for user-supplied assertions.

The adapter handles asynchronous probe cancellation, attempt-scoped callbacks, failures and idempotent stop. It never owns or stops the recorder. The owner clears transcript state at a new attempt, clears interim on final and stops recognition at recording teardown/phrase change/navigation. With-reference mode is unavailable independently of provider support, because recognizing the loud reference as learner speech remains unverified. Manual/silence/30-second recording termination is unchanged.

`LivePracticeTranscript` has a private feedback-capture subtree, explicit opt-in, English language, provisional/final labels and a plain-recording fallback. It performs no model download. A missing-model message is information only; there is no install action until an approved implementation can disclose vendor destination, network requests, size, device storage and removal steps before informed consent. Opting into text must not implicitly install a model.

## Device evidence required before enabling a provider

Record hardware, OS/browser versions, English model identifier/version and installation state. Verify explicit local mode and successful recognition offline with browser **and system** network monitoring. Browser page-request interception alone cannot inspect a built-in service's traffic. Inspect model download destinations separately without microphone access; record consent/storage/removal behavior.

Test plain recording plus recognition on the same microphone: denied/revoked permission, no model, failed local API, quiet/noisy English phrases, initial/ending silence, background/device loss, rapid Stop/start and navigation. Verify all microphone resources release and ordinary capture survives recognition errors. Keep inaccurate interim/final examples and cleanup traces sanitized; never include private text in feedback actions, metrics or screenshots.

| Profile | Real device locality/offline | Recorder coexistence | Enabled |
| --- | --- | --- | --- |
| Desktop Chrome | Not measured | Not measured | No |
| Desktop Safari | Not measured | Not measured | No |
| Android Chrome | Not measured | Not measured | No |
| iOS Safari | Not measured | Not measured | No |
| Edge candidate from primary docs | Not measured | Not measured | No |

No cloud fallback or transcript-based auto-stop is approved. Unsupported local text plus working ordinary recording is the accepted fallback. Physical-device evidence remains an explicit pending release check.

import Link from "next/link";
import { ShadowingPractice } from "@/components/ShadowingPractice";
import { voiceComparisonScenario } from "@/lib/fixtures/voice-comparison";

export default function VoiceComparisonPage() {
  return (
    <main className="min-h-screen bg-[#f4f5ef] px-5 pb-12 pt-6 text-[#173d33] sm:px-8 sm:pt-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#477060]"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-2xl bg-[#173d33] text-lg font-bold text-[#d7ff7a]"
            >
              e
            </span>
            <span className="text-lg font-semibold tracking-tight">EchoFlow</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[#557168] transition hover:text-[#173d33]"
          >
            ← Back home
          </Link>
        </header>

        <section className="mb-7 mt-12 sm:mb-9 sm:mt-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#668078]">
            Voice comparison · 01
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            {voiceComparisonScenario.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#61776e]">
            {voiceComparisonScenario.description}
          </p>
        </section>

        <ShadowingPractice scenario={voiceComparisonScenario} />

        <footer className="mx-auto mt-8 max-w-6xl rounded-2xl border border-[#dce4dc] bg-white/70 px-5 py-4 text-sm leading-6 text-[#61776e]">
          <strong className="font-semibold text-[#294b40]">Privacy for this local session.</strong>{" "}
          Microphone access starts only when you choose Record. Your clip stays in memory and is
          discarded when this page is reloaded or closed.
        </footer>
      </div>
    </main>
  );
}

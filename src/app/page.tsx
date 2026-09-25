import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f5ef] text-[#173d33]">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-8 sm:pt-9">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="EchoFlow home" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-2xl bg-[#173d33] text-lg font-bold text-[#d7ff7a]"
            >
              e
            </span>
            <span className="text-lg font-semibold tracking-tight">EchoFlow</span>
          </Link>
          <span className="rounded-full border border-[#d8e1d8] bg-white/70 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#547167]">
            Local prototype
          </span>
        </header>

        <section className="relative mt-12 grid items-center gap-12 lg:mt-20 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 top-20 size-80 rounded-full bg-[#d7ff7a]/25 blur-3xl"
          />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#cddbcf] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#477060]">
              <span className="size-2 rounded-full bg-[#80aa4e]" /> English speaking practice
            </p>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#173d33] sm:text-6xl lg:text-7xl">
              Find your rhythm in English.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#61776e]">
              Listen to a phrase, say it in your own voice, then compare the two. A focused
              shadowing session you can try right here.
            </p>
            <Link
              href="/scenarios/introducing-yourself"
              className="mt-8 inline-flex min-h-14 items-center gap-4 rounded-full bg-[#173d33] px-6 py-4 text-sm font-bold text-white shadow-[0_16px_32px_rgba(23,61,51,0.16)] transition hover:-translate-y-0.5 hover:bg-[#245343]"
            >
              Open scenario{" "}
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-full bg-[#d7ff7a] text-[#173d33]"
              >
                →
              </span>
            </Link>
            <p className="mt-4 text-sm text-[#71847c]">
              No account. No upload. Your recording stays in this page session.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div
              aria-hidden="true"
              className="absolute -right-5 -top-5 size-28 rounded-full border border-[#cddbcf] sm:-right-8 sm:-top-8 sm:size-40"
            />
            <article className="relative overflow-hidden rounded-[2rem] bg-[#173d33] p-6 text-white shadow-[0_32px_90px_rgba(23,61,51,0.17)] sm:p-9">
              <div
                aria-hidden="true"
                className="absolute -bottom-24 -right-14 size-60 rounded-full bg-[#d7ff7a]/10 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b5d0c4]">
                    Your first session
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Introducing Yourself
                  </h2>
                </div>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#d8e8de]">
                  3 phrases
                </span>
              </div>
              <div className="relative mt-8 space-y-3">
                {[
                  ["01", "Listen to the reference"],
                  ["02", "Record up to 30 seconds"],
                  ["03", "Compare in sequence"],
                ].map(([number, label]) => (
                  <div
                    key={number}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-[#d7ff7a] text-xs font-bold text-[#173d33]">
                      {number}
                    </span>
                    <span className="text-sm font-semibold text-[#f4f8f4]">{label}</span>
                  </div>
                ))}
              </div>
              <p className="relative mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5cfc3]">
                Reference audio is a local synthetic fixture. Recording is kept in memory and
                cleared when you leave or reload.
              </p>
            </article>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[#dce4dc] pt-5 text-xs text-[#74877e] sm:mt-20">
          <span>EchoFlow · local shadowing prototype</span>
          <span>Listen first. Practice at your own pace.</span>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-3xl border border-emerald-950/10 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
          EchoFlow
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">
          Find your rhythm in English.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          The project foundation is ready. The listening and speaking practice experience will be
          built in small, reviewable steps.
        </p>
      </section>
    </main>
  );
}

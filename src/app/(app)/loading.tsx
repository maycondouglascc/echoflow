export default function Loading() {
  return (
    <main className="logged-page" aria-busy="true">
      <div className="platform-grid loading-shell" role="status" aria-label="Loading your practice">
        <aside className="platform-sidebar">
          <div className="loading-line" />
          <div className="loading-line" />
          <div className="loading-line" />
        </aside>
        <section className="platform-panel">
          <p>Loading your practice…</p>
        </section>
      </div>
    </main>
  );
}

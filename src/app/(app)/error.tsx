"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <div className="auth-form">
        <h1>We couldn’t load your practice</h1>
        <p>Check your connection and try again.</p>
        <button type="button" className="dark-button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

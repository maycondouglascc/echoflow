import type { ReactNode } from "react";

export function PracticeShell({
  sidebar,
  toolbar,
  children,
}: {
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="platform-grid">
      <aside className="platform-sidebar practice-sidebar">{sidebar}</aside>
      <section aria-labelledby="practice-title" className="platform-panel practice-panel">
        {toolbar}
        {children}
      </section>
    </section>
  );
}

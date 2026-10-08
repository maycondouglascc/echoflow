"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

export interface PracticeShellProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  account?: ReactNode;
  privacy?: ReactNode;
  playlists?: ReactNode;
}

export function PracticeShell({
  sidebar,
  toolbar,
  children,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  account,
  privacy,
  playlists,
}: PracticeShellProps) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false);
  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed;

  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const lastListFocusRef = useRef<HTMLElement | null>(null);
  const isInitialMount = useRef(true);

  const handleSidebarFocusCapture = (e: React.FocusEvent<HTMLElement>) => {
    if (e.target !== collapseButtonRef.current && e.target instanceof HTMLElement) {
      lastListFocusRef.current = e.target;
    }
  };

  const handleCollapse = () => {
    if (!isControlled) {
      setUncontrolledCollapsed(true);
    }
    onCollapsedChange?.(true);
  };

  const handleRestore = () => {
    if (!isControlled) {
      setUncontrolledCollapsed(false);
    }
    onCollapsedChange?.(false);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isCollapsed) {
      restoreButtonRef.current?.focus();
    } else {
      if (lastListFocusRef.current?.isConnected) {
        lastListFocusRef.current.focus();
      } else {
        const firstListTarget = document
          .getElementById("practice-sidebar")
          ?.querySelector<HTMLElement>(
            ".phrase-list button, .phrase-select-button, [data-feedback-action='select-phrase']",
          );
        firstListTarget?.focus();
      }
    }
  }, [isCollapsed]);

  return (
    <section className={`platform-grid practice-grid${isCollapsed ? " is-collapsed" : ""}`}>
      <aside
        id="practice-sidebar"
        className={`platform-sidebar practice-sidebar${isCollapsed ? " is-collapsed" : ""}`}
        inert={isCollapsed ? true : undefined}
        aria-hidden={isCollapsed ? true : undefined}
        onFocusCapture={handleSidebarFocusCapture}
      >
        <div className="practice-sidebar-controls">
          <button
            type="button"
            ref={collapseButtonRef}
            className="practice-collapse-button"
            data-feedback-action="collapse-sidebar"
            aria-expanded={!isCollapsed}
            aria-controls="practice-sidebar"
            aria-label="Collapse practice sidebar"
            onClick={handleCollapse}
          >
            <span aria-hidden="true" className="collapse-icon">
              ◀
            </span>
            <span>Collapse</span>
          </button>
        </div>
        {sidebar}
      </aside>
      <section aria-labelledby="practice-title" className="platform-panel practice-panel">
        {isCollapsed && (
          <div className="practice-collapsed-bar" data-testid="practice-collapsed-bar">
            <button
              type="button"
              ref={restoreButtonRef}
              className="practice-restore-button"
              data-feedback-action="restore-sidebar"
              aria-expanded={false}
              aria-controls="practice-sidebar"
              aria-label="Show practice phrases"
              onClick={handleRestore}
            >
              <span aria-hidden="true" className="restore-icon">
                ▶
              </span>
              <span>Phrases</span>
            </button>
            <nav className="practice-collapsed-links" aria-label="Alternate practice navigation">
              {playlists ?? (
                <Link href="/home" className="back-link">
                  <Image src="/design/back.svg" width={20} height={20} alt="" />
                  Playlists
                </Link>
              )}
              {privacy ?? (
                <Link href="/privacy" className="account-privacy">
                  Privacy
                </Link>
              )}
            </nav>
            {account ? <div className="practice-collapsed-account">{account}</div> : null}
          </div>
        )}
        {toolbar}
        {children}
      </section>
    </section>
  );
}

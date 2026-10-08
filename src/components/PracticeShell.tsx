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
  title?: string;
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
  title = "Practice",
}: PracticeShellProps) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed;
  const sidebarHidden = isMobile ? !drawerOpen : isCollapsed;
  const sidebarRef = useRef<HTMLElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const previousDrawerOpen = useRef(false);

  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const lastListFocusRef = useRef<HTMLElement | null>(null);
  const isInitialMount = useRef(true);

  const handleSidebarFocusCapture = (e: React.FocusEvent<HTMLElement>) => {
    if (e.target !== collapseButtonRef.current && e.target instanceof HTMLElement) {
      lastListFocusRef.current = e.target;
    }
  };

  const keepPanelFocusVisible = (event: React.FocusEvent<HTMLElement>) => {
    if (!isMobile || !(event.target instanceof HTMLElement)) return;
    const target = event.target;
    // Native focus scrolling happens after the focus event. Inspect the final
    // position next frame, and ignore a target that has since lost focus.
    requestAnimationFrame(() => {
      if (!target.isConnected || document.activeElement !== target) return;
      const feedback = document.querySelector(".feedback-trigger");
      if (!feedback) return;
      const focused = target.getBoundingClientRect();
      const overlay = feedback.getBoundingClientRect();
      if (
        focused.left < overlay.right &&
        focused.right > overlay.left &&
        focused.top < overlay.bottom &&
        focused.bottom > overlay.top
      ) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });
  };

  const handleCollapse = () => {
    if (isMobile) {
      setDrawerOpen(false);
      return;
    }
    if (!isControlled) {
      setUncontrolledCollapsed(true);
    }
    onCollapsedChange?.(true);
  };

  useEffect(() => {
    if (isMobile && previousDrawerOpen.current && !drawerOpen) {
      // React has removed inert from the panel before restoring its trigger.
      drawerTriggerRef.current?.focus();
    }
    previousDrawerOpen.current = drawerOpen;
  }, [drawerOpen, isMobile]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile || !drawerOpen) return;
    const sidebar = sidebarRef.current;
    // Modality applies only while this retained sidebar is the mobile dialog.
    sidebar?.setAttribute("aria-modal", "true");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    collapseButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
      }
      if (event.key !== "Tab") return;
      const targets = Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((target) => target.getClientRects().length > 0);
      const first = targets[0];
      const last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    sidebar?.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      sidebar?.removeAttribute("aria-modal");
      sidebar?.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, isMobile]);

  const handleRestore = () => {
    if (!isControlled) {
      setUncontrolledCollapsed(false);
    }
    onCollapsedChange?.(false);
  };

  useEffect(() => {
    if (isMobile) return;
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
  }, [isCollapsed, isMobile]);

  return (
    <section className={`platform-grid practice-grid${isCollapsed ? " is-collapsed" : ""}`}>
      {isMobile && drawerOpen ? (
        <button
          type="button"
          className="practice-drawer-backdrop"
          aria-label="Dismiss practice phrases"
          tabIndex={-1}
          onClick={handleCollapse}
        />
      ) : null}
      <aside
        ref={sidebarRef}
        id="practice-sidebar"
        className={`platform-sidebar practice-sidebar${isCollapsed ? " is-collapsed" : ""}${drawerOpen ? " is-drawer-open" : ""}`}
        inert={sidebarHidden ? true : undefined}
        aria-hidden={sidebarHidden ? true : undefined}
        role={isMobile && drawerOpen ? "dialog" : "complementary"}
        aria-label="Practice phrases"
        onFocusCapture={handleSidebarFocusCapture}
      >
        <div className="practice-sidebar-controls">
          <button
            type="button"
            ref={collapseButtonRef}
            className="practice-collapse-button"
            data-feedback-action="collapse-sidebar"
            aria-expanded={!sidebarHidden}
            aria-controls="practice-sidebar"
            aria-label={isMobile ? "Close practice phrases" : "Collapse practice sidebar"}
            onClick={handleCollapse}
          >
            <span aria-hidden="true" className="collapse-icon">
              ◀
            </span>
            <span>{isMobile ? "Close" : "Collapse"}</span>
          </button>
        </div>
        {sidebar}
      </aside>
      <section
        aria-labelledby="practice-title"
        className="platform-panel practice-panel"
        onFocusCapture={keepPanelFocusVisible}
        inert={isMobile && drawerOpen ? true : undefined}
      >
        <div className="practice-mobile-navigation">
          <h1 className="practice-mobile-title">{title}</h1>
          <button
            type="button"
            ref={drawerTriggerRef}
            className="practice-restore-button"
            aria-label="Show practice phrases"
            aria-controls="practice-sidebar"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            Phrases
          </button>
          <Link href="/home">Playlists</Link>
          <Link href="/privacy">Privacy</Link>
          {account}
        </div>
        {!isMobile && isCollapsed && (
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

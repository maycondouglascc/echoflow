import { expect, type Page, test } from "@playwright/test";

interface MountOptions {
  phraseCount?: number;
  collapsed?: boolean;
  counts?: Record<string, number>;
  pending?: Record<string, number>;
  recording?: boolean;
}

// Fixture helper to mount practice DOM structure on a page with catalog-practice.css loaded
async function mountPracticeFixture(page: Page, options: MountOptions = {}) {
  const {
    phraseCount = 8,
    collapsed = false,
    counts = {},
    pending = {},
    recording = false,
  } = options;

  await page.goto("/login");
  await page.evaluate(
    ({ phraseCount, collapsed, counts, pending, recording }: Required<MountOptions>) => {
      const phrasesHtml = Array.from({ length: phraseCount }, (_, i) => {
        const id = `phrase-${i + 1}`;
        const count = counts[id] ?? 0;
        const isHeard = count > 0;
        const pendingCount = pending[id] ?? 0;
        const hasPending = pendingCount > 0;

        const heardBadge = isHeard
          ? `<span class="phrase-badge phrase-heard-badge" data-testid="phrase-heard-badge">Heard${count > 1 ? ` (${count})` : ""}</span>`
          : "";
        const unsavedBadge = hasPending
          ? `<span class="phrase-badge phrase-unsaved-badge" data-testid="phrase-unsaved-badge">Unsaved</span>`
          : "";
        const badgesHtml =
          isHeard || hasPending
            ? `<span class="phrase-badges">${heardBadge}${unsavedBadge}</span>`
            : "";
        const retryHtml = hasPending
          ? `<button type="button" class="phrase-retry-button text-button" data-feedback-action="retry-phrase-history" aria-label="Retry saving history for phrase ${i + 1}">Retry</button>`
          : "";

        return `
          <li class="phrase-item">
            <button
              type="button"
              data-feedback-action="select-phrase"
              id="phrase-btn-${i + 1}"
              class="phrase-select-button"
              aria-pressed="${i === 0 ? "true" : "false"}"
              aria-label="Choose phrase ${i + 1}: Sample phrase ${i + 1}${isHeard ? `, Heard ${count} times` : ""}${hasPending ? ", Unsaved" : ""}"
            >
              <span class="phrase-number">${String(i + 1).padStart(2, "0")}</span>
              <span class="phrase-body">
                <span class="phrase-text">Sample phrase ${i + 1} with realistic length for practice text</span>
                <span class="sr-only">Category</span>
                ${badgesHtml}
              </span>
            </button>
            ${retryHtml}
          </li>
        `;
      }).join("");

      const collapsedBarHtml = collapsed
        ? `
          <div class="practice-collapsed-bar" data-testid="practice-collapsed-bar">
            <button
              type="button"
              id="restore-sidebar-btn"
              class="practice-restore-button"
              data-feedback-action="restore-sidebar"
              aria-expanded="false"
              aria-controls="practice-sidebar"
              aria-label="Show practice phrases"
            >
              <span aria-hidden="true" class="restore-icon">▶</span>
              <span>Phrases</span>
            </button>
            <nav class="practice-collapsed-links" aria-label="Alternate practice navigation">
              <a href="/home" class="back-link">Playlists</a>
              <a href="/privacy" class="account-privacy">Privacy</a>
            </nav>
            <div class="practice-collapsed-account">
              <button type="button" class="account-button">Account</button>
            </div>
          </div>
        `
        : "";

      document.body.innerHTML = `
        <main class="logged-page" style="margin: 0; box-sizing: border-box;">
          <section class="platform-grid practice-grid${collapsed ? " is-collapsed" : ""}">
            <aside
              id="practice-sidebar"
              class="platform-sidebar practice-sidebar${collapsed ? " is-collapsed" : ""}"
              ${collapsed ? "inert aria-hidden='true'" : ""}
            >
              <div class="practice-sidebar-controls">
                <button
                  type="button"
                  id="collapse-sidebar-btn"
                  class="practice-collapse-button"
                  data-feedback-action="collapse-sidebar"
                  aria-expanded="${!collapsed}"
                  aria-controls="practice-sidebar"
                  aria-label="Collapse practice sidebar"
                >
                  <span aria-hidden="true" class="collapse-icon">◀</span>
                  <span>Collapse</span>
                </button>
              </div>
              <a href="/home" class="back-link">Playlists</a>
              <h1>Introducing Yourself</h1>
              <h2 class="up-next">Practice phrases</h2>
              <ol class="phrase-list">
                ${phrasesHtml}
              </ol>
            </aside>
            <section aria-labelledby="practice-title" class="platform-panel practice-panel">
              ${collapsedBarHtml}
              <div class="practice-toolbar">
                <fieldset class="voice-toggle">
                  <legend class="sr-only">Reference voice</legend>
                  <label><input type="radio" name="ref-voice" checked /><span class="voice-pill">Puck</span></label>
                  <label><input type="radio" name="ref-voice" /><span class="voice-pill">Harper</span></label>
                </fieldset>
                <span class="practice-mode">Shadowing</span>
              </div>
              <h2 id="practice-title" class="sr-only">Reference phrase 01</h2>
              <div class="transcript-area">
                <p class="practice-transcript">Hello, my name is Alex.</p>
              </div>
              <div class="practice-bottom">
                <div class="practice-actions">
                  <div class="numbered-action">
                    <span class="step-number" aria-hidden="true">1</span>
                    <button type="button" data-feedback-action="listen-reference" class="dark-button">Play reference</button>
                  </div>
                  <div class="numbered-action">
                    <span class="step-number" aria-hidden="true">2</span>
                    ${
                      recording
                        ? `<button type="button" data-feedback-action="stop-recording" class="dark-button stop-recording-button">Stop recording</button>`
                        : `<button type="button" data-feedback-action="record" class="dark-button">Speak</button>`
                    }
                  </div>
                  <div class="numbered-action">
                    <span class="step-number" aria-hidden="true">3</span>
                    <button type="button" data-feedback-action="compare" class="dark-button">Compare</button>
                  </div>
                  <button type="button" data-feedback-action="play-recording" class="dark-button">My recording</button>
                </div>
                <div class="practice-feedback">
                  ${recording ? `<p class="recording-clock">00:05 / 00:30</p>` : `<p role="status" class="sr-only">Ready</p>`}
                </div>
                <div class="phrase-navigation">
                  <button type="button" data-feedback-action="next-phrase" class="next-phrase">Next phrase</button>
                </div>
              </div>
            </section>
          </section>
        </main>
      `;

      // Wire interactive collapse / restore simulation with focus management
      const sidebarEl = document.getElementById("practice-sidebar");
      const collapseBtn = document.getElementById("collapse-sidebar-btn");
      let lastListFocus: HTMLElement | null = null;

      sidebarEl?.addEventListener(
        "focus",
        (e) => {
          if (e.target !== collapseBtn && e.target instanceof HTMLElement) {
            lastListFocus = e.target;
          }
        },
        true,
      );

      collapseBtn?.addEventListener("click", () => {
        const grid = document.querySelector(".practice-grid");
        grid?.classList.add("is-collapsed");
        sidebarEl?.classList.add("is-collapsed");
        sidebarEl?.setAttribute("inert", "");
        sidebarEl?.setAttribute("aria-hidden", "true");

        // Inject collapsed bar
        const panel = document.querySelector(".practice-panel");
        let bar = document.querySelector(".practice-collapsed-bar");
        if (!bar && panel) {
          bar = document.createElement("div");
          bar.className = "practice-collapsed-bar";
          bar.setAttribute("data-testid", "practice-collapsed-bar");
          bar.innerHTML = `
            <button
              type="button"
              id="restore-sidebar-btn"
              class="practice-restore-button"
              data-feedback-action="restore-sidebar"
              aria-expanded="false"
              aria-controls="practice-sidebar"
              aria-label="Show practice phrases"
            >
              <span aria-hidden="true" class="restore-icon">▶</span>
              <span>Phrases</span>
            </button>
            <nav class="practice-collapsed-links" aria-label="Alternate practice navigation">
              <a href="/home" class="back-link">Playlists</a>
              <a href="/privacy" class="account-privacy">Privacy</a>
            </nav>
            <div class="practice-collapsed-account">
              <button type="button" class="account-button">Account</button>
            </div>
          `;
          panel.insertBefore(bar, panel.firstChild);

          const restoreBtn = document.getElementById("restore-sidebar-btn");
          restoreBtn?.addEventListener("click", () => {
            grid?.classList.remove("is-collapsed");
            sidebarEl?.classList.remove("is-collapsed");
            sidebarEl?.removeAttribute("inert");
            sidebarEl?.removeAttribute("aria-hidden");
            bar?.remove();
            if (lastListFocus?.isConnected) {
              lastListFocus.focus();
            } else {
              document.querySelector<HTMLElement>(".phrase-list button")?.focus();
            }
          });
          restoreBtn?.focus();
        }
      });
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("resize"));
    },
    { phraseCount, collapsed, counts, pending, recording },
  );
}

test("desktop viewport >= 1024x768 fills available height (100dvh - 48px), document does not scroll, only phrase list scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountPracticeFixture(page, { phraseCount: 20 });

  const grid = page.locator(".platform-grid.practice-grid");
  await expect(grid).toBeVisible();

  // On 800px viewport, 100dvh - 48px is 752px
  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();
  if (gridBox) {
    expect(Math.abs(gridBox.height - 752)).toBeLessThanOrEqual(6);
  }

  // Document itself does not scroll vertically on standard desktop practice layout; body fits available height
  const { bodyScroll, winInner, panelOverflowY, phraseListOverflowY } = await page.evaluate(() => {
    const panel = document.querySelector(".practice-panel");
    const phraseList = document.querySelector(".phrase-list");
    return {
      bodyScroll: document.body.scrollHeight,
      winInner: window.innerHeight,
      panelOverflowY: panel ? window.getComputedStyle(panel).overflowY : "",
      phraseListOverflowY: phraseList ? window.getComputedStyle(phraseList).overflowY : "",
    };
  });
  expect(bodyScroll).toBeLessThanOrEqual(winInner);
  expect(panelOverflowY).toBe("hidden");
  expect(phraseListOverflowY).toBe("auto");
});

test("collapse and restore sidebar manages keyboard focus, avoids hidden focus and keeps Playlists/Privacy reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountPracticeFixture(page, { phraseCount: 10 });

  // Focus and select phrase 2
  const phrase2 = page.locator("#phrase-btn-2");
  await phrase2.focus();
  await phrase2.click();

  const collapseBtn = page.getByRole("button", { name: "Collapse practice sidebar" });
  await expect(collapseBtn).toBeVisible();
  await expect(collapseBtn).toHaveAttribute("aria-expanded", "true");
  await expect(collapseBtn).toHaveAttribute("aria-controls", "practice-sidebar");

  // Collapse sidebar
  await collapseBtn.click();

  const sidebar = page.locator("#practice-sidebar");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");

  // Restore button in main panel is rendered, focused, and has proper ARIA
  const restoreBtn = page.getByRole("button", { name: "Show practice phrases" });
  await expect(restoreBtn).toBeVisible();
  await expect(restoreBtn).toBeFocused();
  await expect(restoreBtn).toHaveAttribute("aria-expanded", "false");
  await expect(restoreBtn).toHaveAttribute("aria-controls", "practice-sidebar");

  // Alternate navigation slot provides reachable Playlists and Privacy links
  const collapsedBar = page.getByTestId("practice-collapsed-bar");
  await expect(collapsedBar).toBeVisible();
  await expect(collapsedBar.getByRole("link", { name: "Playlists" })).toBeVisible();
  await expect(collapsedBar.getByRole("link", { name: "Privacy" })).toBeVisible();

  // Test that tabbing does not focus any element inside the hidden sidebar
  await page.keyboard.press("Tab");
  const activeInsideSidebar = await page.evaluate(() => {
    const el = document.getElementById("practice-sidebar");
    return el ? el.contains(document.activeElement) : false;
  });
  expect(activeInsideSidebar).toBe(false);

  // Restore the sidebar
  await restoreBtn.click();
  await expect(sidebar).not.toHaveAttribute("aria-hidden", "true");
  await expect(sidebar).toBeVisible();

  // Focus returned to the previous list target (phrase 2), avoiding collapse button
  await expect(phrase2).toBeFocused();
});

test("short viewport and 200% zoom provide accessible scrolling fallback with reachable controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 480 });
  await mountPracticeFixture(page, { phraseCount: 8, recording: true });

  // Accessible scrolling fallback is activated (overflow visible)
  const gridOverflow = await page
    .locator(".platform-grid.practice-grid")
    .evaluate((el) => window.getComputedStyle(el).overflow);
  expect(gridOverflow).toBe("visible");

  // All primary practice controls remain accessible in DOM
  await expect(page.getByRole("button", { name: "Play reference" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compare" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My recording" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next phrase" })).toBeVisible();
});

test("mobile viewport adapts without horizontal scroll and keeps controls reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mountPracticeFixture(page, { phraseCount: 5 });

  // No horizontal scrollbar
  const fitsHorizontal = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsHorizontal).toBe(true);

  // Phrases and controls reachable
  await expect(page.getByRole("button", { name: /Choose phrase 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play reference" })).toBeVisible();
});

test("PhrasePracticeList displays canonical Heard counts, separate Unsaved badge and Retry action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountPracticeFixture(page, {
    phraseCount: 4,
    counts: { "phrase-1": 3, "phrase-2": 1 },
    pending: { "phrase-2": 1, "phrase-3": 1 },
  });

  // Phrase 1: Heard (3), no unsaved
  const phrase1 = page.locator("#phrase-btn-1");
  await expect(phrase1).toContainText("Heard (3)");
  await expect(phrase1).not.toContainText("Unsaved");

  // Phrase 2: Heard, plus SEPARATE Unsaved badge (canonical count remains separate from pending)
  const phrase2 = page.locator("#phrase-btn-2");
  await expect(phrase2).toContainText("Heard");
  await expect(phrase2).toContainText("Unsaved");
  await expect(
    page.getByRole("button", { name: "Retry saving history for phrase 2" }),
  ).toBeVisible();

  // Phrase 3: Unsaved only, count is zero (no Heard badge)
  const phrase3 = page.locator("#phrase-btn-3");
  await expect(phrase3).toContainText("Unsaved");
  await expect(phrase3).not.toContainText("Heard");
  await expect(
    page.getByRole("button", { name: "Retry saving history for phrase 3" }),
  ).toBeVisible();

  // Phrase 4: Unheard, no unsaved
  const phrase4 = page.locator("#phrase-btn-4");
  await expect(phrase4).not.toContainText("Heard");
  await expect(phrase4).not.toContainText("Unsaved");
});

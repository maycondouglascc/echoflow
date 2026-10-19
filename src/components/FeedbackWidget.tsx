"use client";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useId, useRef, useState } from "react";
import {
  FEEDBACK_ACTIONS,
  type FeedbackAction,
  type FeedbackEvent,
  type FeedbackMetadata,
  recentEvents,
  validPath,
} from "@/lib/feedback";
import { captureFeedbackViewport } from "@/lib/feedback-capture";
import { ModalDialog } from "./ModalDialog";

type DraftContext = Omit<FeedbackMetadata, "id" | "message">;

const posthogConfigured =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function FeedbackWidget() {
  const pathname = usePathname();
  const pathRef = useRef(pathname),
    events = useRef<FeedbackEvent[]>([]);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    textArea = useRef<HTMLTextAreaElement>(null);
  const generation = useRef(0),
    attempt = useRef<{ id: string; signature: string } | null>(null);
  const sending = useRef(false);
  const title = useId(),
    description = useId(),
    field = useId();
  const [message, setMessage] = useState(""),
    [context, setContext] = useState<DraftContext | null>(null);
  const [screenshot, setScreenshot] = useState<Blob | null>(null),
    [preview, setPreview] = useState<string | null>(null);
  const [includeImage, setIncludeImage] = useState(true),
    [includeHistory, setIncludeHistory] = useState(true);
  const [shareWithPostHog, setShareWithPostHog] = useState(false);
  const [capture, setCapture] = useState<"pending" | "ready" | "failed">("pending");
  const [state, setState] = useState<"draft" | "sending" | "success">("draft"),
    [error, setError] = useState("");
  useEffect(() => {
    pathRef.current = pathname;
    if (validPath(pathname))
      events.current = recentEvents([
        ...events.current,
        { path: pathname, action: "page", at: new Date().toISOString() },
      ]);
  }, [pathname]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (dialog.current?.open || !(event.target instanceof Element) || !validPath(pathRef.current))
        return;
      const control = event.target.closest("[data-feedback-action]");
      if (!control || control.matches(":disabled")) return;
      const action = control.getAttribute("data-feedback-action") as FeedbackAction;
      if (FEEDBACK_ACTIONS.includes(action) && action !== "page")
        events.current = recentEvents([
          ...events.current,
          { path: pathRef.current, action, at: new Date().toISOString() },
        ]);
    };
    document.addEventListener("click", click, { passive: true });
    return () => {
      document.removeEventListener("click", click);
      events.current = [];
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (!screenshot) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);
  const close = () => {
    // Discard local attachments on cancellation; keep failed submissions until retry or cancel.
    generation.current++;
    dialog.current?.close();
    trigger.current?.focus();
    if (!sending.current) {
      setScreenshot(null);
      setContext(null);
      setMessage("");
      setError("");
      attempt.current = null;
    }
  };
  const open = () => {
    if (sending.current) return;
    setState("draft");
    setError("");
    setIncludeImage(true);
    setIncludeHistory(true);
    setShareWithPostHog(false);
    setCapture("pending");
    setScreenshot(null);
    const token = ++generation.current;
    const now = Date.now();
    setContext({
      pagePath: pathname,
      capturedAt: new Date(now).toISOString(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      navigation: recentEvents(events.current, now),
    });
    // This function freezes the DOM synchronously before showModal; its library is lazy.
    void captureFeedbackViewport()
      .then((blob) => {
        if (token === generation.current && blob) {
          setScreenshot(blob);
          setCapture("ready");
        }
      })
      .catch(() => {
        if (token === generation.current) setCapture("failed");
      });
    dialog.current?.showModal();
    textArea.current?.focus();
  };
  const submit = async () => {
    if (!context || sending.current) return;
    const metadata = {
      ...context,
      message: message.trim(),
      navigation: includeHistory ? context.navigation : [],
    };
    const image = includeImage ? screenshot : null;
    const signature = `${JSON.stringify(metadata)}:${image?.size ?? 0}:${includeImage}`;
    if (!attempt.current || attempt.current.signature !== signature)
      attempt.current = { id: crypto.randomUUID(), signature };
    const body = new FormData();
    body.set("metadata", JSON.stringify({ ...metadata, id: attempt.current.id }));
    if (image) body.set("screenshot", image, "page.png");
    sending.current = true;
    setState("sending");
    setError("");
    try {
      const result = await fetch("/api/feedback", { method: "POST", body });
      if (!result.ok)
        throw new Error(
          result.status === 401
            ? "Your session expired. Log in again to send feedback."
            : "We could not send your feedback. Your draft is still here. Please try again.",
        );
      const receipt: unknown = await result.json();
      if (
        !receipt ||
        typeof receipt !== "object" ||
        !("id" in receipt) ||
        receipt.id !== attempt.current?.id
      )
        throw new Error("We could not confirm your feedback. Please try again.");
      if (posthogConfigured)
        posthog.capture("feedback_submitted", {
          included_navigation: includeHistory,
          included_screenshot: Boolean(image),
        });
      if (posthogConfigured && shareWithPostHog)
        posthog.capture("product_feedback_submitted", {
          feedback_text: message.trim(),
        });
      setState("success");
      setMessage("");
      setScreenshot(null);
      attempt.current = null;
    } catch (e) {
      setState("draft");
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      sending.current = false;
    }
  };
  return (
    <div data-feedback-ui="true">
      <button
        ref={trigger}
        type="button"
        className="feedback-trigger"
        onClick={open}
        aria-haspopup="dialog"
      >
        Feedback
      </button>
      <ModalDialog
        dialogRef={dialog}
        titleId={title}
        descriptionId={description}
        closeLabel="Close feedback"
        onClose={close}
        dismissDisabled={state === "sending"}
      >
        <div className="feedback-form">
          <h2 id={title}>
            {state === "success" ? "Thanks for your feedback!" : "Help improve EchoFlow"}
          </h2>
          <p id={description}>
            {state === "success"
              ? "Your suggestion has been received."
              : "Tell us what could work better. Review the page context before sending."}
          </p>
          {state === "success" ? (
            <button className="dark-button" type="button" onClick={close}>
              Done
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label htmlFor={field}>Your suggestion</label>
              <textarea
                ref={textArea}
                id={field}
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={state === "sending"}
                placeholder="What happened, and what would you improve?"
              />
              <span className="feedback-hint">
                10–5,000 characters · Please avoid personal or sensitive information.
              </span>
              <fieldset disabled={state === "sending"}>
                <legend>Page context</legend>
                <label className="feedback-check">
                  <input
                    type="checkbox"
                    checked={includeImage}
                    onChange={(e) => setIncludeImage(e.target.checked)}
                  />{" "}
                  Include screenshot
                </label>
                {includeImage && capture === "pending" ? (
                  <p role="status">Preparing screenshot…</p>
                ) : null}
                {includeImage && capture === "failed" ? (
                  <p role="status">Screenshot unavailable. You can still send your suggestion.</p>
                ) : null}
                {includeImage && preview ? (
                  // biome-ignore lint/performance/noImgElement: Local ephemeral blob preview; never optimize or upload.
                  <img
                    className="feedback-preview"
                    src={preview}
                    alt="Screenshot of the page to attach to your feedback"
                  />
                ) : null}
                <label className="feedback-check">
                  <input
                    type="checkbox"
                    checked={includeHistory}
                    onChange={(e) => setIncludeHistory(e.target.checked)}
                  />{" "}
                  Include recent navigation
                </label>
                {includeHistory ? (
                  <ol className="feedback-history">
                    {context?.navigation.map((event) => (
                      <li key={`${event.at}-${event.path}-${event.action}`}>
                        <span>{event.action.replaceAll("-", " ")}</span>
                        <code>{event.path}</code>
                      </li>
                    ))}
                  </ol>
                ) : null}
                <p className="feedback-hint">
                  Only recent pages and selected actions are included as page context. Typed values
                  on the page, microphone audio and video are excluded. Nothing is sent until you
                  submit.
                </p>
              </fieldset>
              {posthogConfigured ? (
                <label className="feedback-check">
                  <input
                    type="checkbox"
                    checked={shareWithPostHog}
                    onChange={(e) => setShareWithPostHog(e.target.checked)}
                    disabled={state === "sending"}
                  />
                  Also share my suggestion text with PostHog for product research. PostHog may link
                  it to my account; the screenshot and recent navigation are excluded.
                </label>
              ) : null}
              {error ? <p role="alert">{error}</p> : null}
              <div className="feedback-buttons">
                <button
                  className="text-button"
                  type="button"
                  onClick={close}
                  disabled={state === "sending"}
                >
                  Cancel
                </button>
                <button
                  className="dark-button"
                  type="submit"
                  disabled={
                    state === "sending" ||
                    message.trim().length < 10 ||
                    (capture === "pending" && includeImage)
                  }
                >
                  {state === "sending" ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </form>
          )}
        </div>
      </ModalDialog>
    </div>
  );
}

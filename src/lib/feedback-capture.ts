import { MAX_SCREENSHOT_BYTES } from "./feedback";

const excluded =
  "input,textarea,select,[contenteditable],dialog,nextjs-portal,iframe,video,audio,canvas,object,embed,[data-feedback-private],[data-feedback-ui],script,style,noscript";
function safeImage(element: HTMLImageElement) {
  const url = new URL(element.currentSrc || element.src, window.location.origin);
  if (url.origin !== window.location.origin) return false;
  return (
    url.pathname.startsWith("/design/") ||
    (url.pathname === "/_next/image" && url.searchParams.get("url")?.startsWith("/design/"))
  );
}
// Freeze computed geometry before the modal opens. Absolute cloned boxes preserve
// document/nested scrolling and fixed/sticky positions without moving the live app.
export async function captureFeedbackViewport(): Promise<Blob> {
  const width = window.innerWidth,
    height = window.innerHeight;
  const stage = document.createElement("div");
  stage.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;background:#fff;`;
  stage.setAttribute("aria-hidden", "true");
  stage.inert = true;
  let count = 0;
  function clone(
    element: Element,
    parent: HTMLElement | SVGElement,
    parentRect: { left: number; top: number },
    borderLeft = 0,
    borderTop = 0,
  ) {
    if (element.matches(excluded) || ++count > 3000) return;
    const rect = element.getBoundingClientRect(),
      computed = getComputedStyle(element);
    if (
      computed.display === "none" ||
      computed.visibility === "hidden" ||
      rect.width === 0 ||
      rect.height === 0
    )
      return;
    if (element instanceof HTMLImageElement && !safeImage(element)) return;
    const copy = element.cloneNode(element instanceof SVGElement) as HTMLElement | SVGElement;
    if (element instanceof SVGElement) {
      copy
        .querySelectorAll("foreignObject,script,image,[data-feedback-private]")
        .forEach((node) => {
          node.remove();
        });
    }
    for (const name of computed) copy.style.setProperty(name, computed.getPropertyValue(name));
    // Resource URLs in styles may carry user information; only public design images are allowed.
    if (computed.backgroundImage !== "none") copy.style.backgroundImage = "none";
    Object.assign(copy.style, {
      position: "absolute",
      left: `${rect.left - parentRect.left - borderLeft}px`,
      top: `${rect.top - parentRect.top - borderTop}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      boxSizing: "border-box",
      margin: "0",
      transform: "none",
      transition: "none",
      animation: "none",
    });
    if (!(element instanceof SVGElement)) {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) copy.appendChild(node.cloneNode());
        else if (node instanceof Element)
          clone(node, copy, rect, element.clientLeft, element.clientTop);
      }
    }
    parent.appendChild(copy);
  }
  for (const element of document.body.children) clone(element, stage, { left: 0, top: 0 });
  if (count > 3000) throw new Error("Page too large to capture.");
  document.body.appendChild(stage);
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = async () => {
      const { toBlob } = await import("html-to-image");
      const scale = Math.min(1, 1920 / width, 1440 / height);
      const blob = await toBlob(stage, {
        pixelRatio: 1,
        canvasWidth: Math.floor(width * scale),
        canvasHeight: Math.floor(height * scale),
        backgroundColor: "#fff",
        style: {
          position: "relative",
          inset: "auto",
          insetInlineStart: "auto",
          insetInlineEnd: "auto",
          insetBlockStart: "auto",
          insetBlockEnd: "auto",
          left: "0",
          top: "0",
          margin: "0",
          transform: "none",
          zIndex: "0",
        },
        fetchRequestInit: { signal: controller.signal },
        filter: (node) => !(node instanceof Element) || !node.matches(excluded),
      });
      if (!blob || blob.size > MAX_SCREENSHOT_BYTES || blob.size === 0)
        throw new Error("Screenshot unavailable.");
      return blob;
    };
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Capture timed out."));
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    controller.abort();
    stage.remove();
  }
}

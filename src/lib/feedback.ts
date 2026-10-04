export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
export const MAX_BODY_BYTES = MAX_SCREENSHOT_BYTES + 64 * 1024;
export const HISTORY_WINDOW_MS = 5 * 60 * 1000;
export const FEEDBACK_ACTIONS = [
  "page",
  "select-phrase",
  "select-voice",
  "listen-reference",
  "replay-word",
  "record",
  "stop-recording",
  "compare",
  "next-phrase",
] as const;
export type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];
export type FeedbackEvent = { path: string; action: FeedbackAction; at: string };
export type FeedbackMetadata = {
  id: string;
  message: string;
  pagePath: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  navigation: FeedbackEvent[];
};
export function validPath(path: unknown): path is string {
  return typeof path === "string" && /^\/(?:home|scenarios\/[a-z0-9-]{1,80})$/.test(path);
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== keys.sort().join(",")
  )
    throw new Error("Invalid feedback.");
  return value as Record<string, unknown>;
}
function instant(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("Invalid time.");
  return Date.parse(value);
}
export function recentEvents(events: FeedbackEvent[], now = Date.now()): FeedbackEvent[] {
  return events
    .filter((e) => Date.parse(e.at) >= now - HISTORY_WINDOW_MS && Date.parse(e.at) <= now)
    .slice(-20);
}
export function parseFeedback(value: unknown, now = Date.now()): FeedbackMetadata {
  const v = record(value, ["id", "message", "pagePath", "capturedAt", "viewport", "navigation"]);
  if (
    typeof v.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.id)
  )
    throw new Error("Invalid identifier.");
  if (
    typeof v.message !== "string" ||
    v.message.trim().length < 10 ||
    v.message.trim().length > 5000 ||
    !validPath(v.pagePath)
  )
    throw new Error("Invalid feedback.");
  const captured = instant(v.capturedAt);
  if (captured < now - 86400000 || captured > now + 60000) throw new Error("Invalid time.");
  const viewport = record(v.viewport, ["width", "height"]);
  for (const n of [viewport.width, viewport.height])
    if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 10000)
      throw new Error("Invalid viewport.");
  if (!Array.isArray(v.navigation) || v.navigation.length > 20) throw new Error("Invalid context.");
  let previous = captured - HISTORY_WINDOW_MS;
  const navigation = v.navigation.map((event) => {
    const e = record(event, ["path", "action", "at"]);
    const time = instant(e.at);
    if (
      !validPath(e.path) ||
      !FEEDBACK_ACTIONS.includes(e.action as FeedbackAction) ||
      time < previous ||
      time > captured
    )
      throw new Error("Invalid context.");
    previous = time;
    return { path: e.path, action: e.action as FeedbackAction, at: e.at as string };
  });
  return {
    id: v.id,
    message: v.message.trim(),
    pagePath: v.pagePath,
    capturedAt: v.capturedAt as string,
    viewport: viewport as FeedbackMetadata["viewport"],
    navigation,
  };
}
export function validatePng(bytes: Uint8Array, mime: string) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    mime !== "image/png" ||
    bytes.length > MAX_SCREENSHOT_BYTES ||
    bytes.length < 45 ||
    signature.some((n, i) => bytes[i] !== n)
  )
    throw new Error("Invalid screenshot.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR")
    throw new Error("Invalid screenshot.");
  const width = view.getUint32(16),
    height = view.getUint32(20);
  if (width < 1 || width > 1920 || height < 1 || height > 1440)
    throw new Error("Invalid screenshot dimensions.");
  let offset = 8,
    hasData = false,
    ended = false;
  while (offset + 12 <= bytes.length) {
    const size = view.getUint32(offset),
      kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (size > bytes.length - offset - 12) throw new Error("Truncated screenshot.");
    if (kind === "IDAT" && size > 0) hasData = true;
    offset += size + 12;
    if (kind === "IEND") {
      if (size !== 0) throw new Error("Invalid screenshot.");
      ended = true;
      break;
    }
  }
  if (!hasData || !ended || offset !== bytes.length) throw new Error("Invalid screenshot.");
}

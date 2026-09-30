export function safeNext(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.includes("\\") ||
    value.includes("%") ||
    value.includes("#")
  )
    return "/home";
  return /^\/(?:home|scenarios\/[a-z0-9-]+|practice\/[a-z0-9-]+)(?:\?[a-zA-Z0-9=&_-]*)?$/.test(
    value,
  )
    ? value
    : "/home";
}

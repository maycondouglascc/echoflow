"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Page-owned bytes only: no HTTP cache, persistence or cross-user shared state.
export function useReferenceBuffer(current: string, next: string) {
  const entries = useRef(new Map<string, { promise: Promise<string>; url?: string }>());
  const abort = useRef<AbortController | null>(null);
  const active = useRef(current);
  active.current = current;
  const [loaded, setLoaded] = useState({ path: "", url: "" });
  const sourceFor = useCallback((path: string) => {
    const existing = entries.current.get(path);
    if (existing) return existing.promise;
    if (!abort.current || abort.current.signal.aborted) abort.current = new AbortController();
    const controller = abort.current;
    const entry: { promise: Promise<string>; url?: string } = {
      promise: Promise.resolve(""),
    };
    entry.promise = fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Reference audio unavailable.");
        const blob = await response.blob();
        if (controller.signal.aborted) throw new Error("Reference buffer closed.");
        entry.url = URL.createObjectURL(blob);
        return entry.url;
      })
      .catch((error: unknown) => {
        if (entries.current.get(path) === entry) entries.current.delete(path);
        throw error;
      });
    entries.current.set(path, entry);
    // At most four entries including in-flight requests, current stays pinned.
    for (const [key, value] of entries.current) {
      if (entries.current.size <= 4) break;
      if (key === active.current || key === path) continue;
      entries.current.delete(key);
      void value.promise.then((url) => URL.revokeObjectURL(url)).catch(() => {});
    }
    return entry.promise;
  }, []);
  useEffect(() => {
    let stale = false;
    if (current)
      void sourceFor(current)
        .then((url) => {
          if (stale) return;
          setLoaded({ path: current, url });
          if (next) void sourceFor(next).catch(() => {});
        })
        .catch(() => {}); // Playback surfaces a recoverable error, speculative preload does not.
    return () => {
      stale = true;
    };
  }, [current, next, sourceFor]);
  useEffect(() => {
    return () => {
      abort.current?.abort();
      for (const entry of entries.current.values())
        void entry.promise.then((url) => URL.revokeObjectURL(url)).catch(() => {});
      entries.current.clear();
    };
  }, []);
  return { sourceFor, source: loaded.path === current ? loaded.url : "" };
}

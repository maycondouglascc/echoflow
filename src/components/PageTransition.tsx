"use client";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  const previousPath = useRef(path);
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ")
        document.documentElement.dataset.keyboardNavigation = "true";
    };
    const pointer = () => {
      delete document.documentElement.dataset.keyboardNavigation;
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("pointerdown", pointer);
    return () => {
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("pointerdown", pointer);
    };
  }, []);
  useEffect(() => {
    if (previousPath.current === path) return;
    previousPath.current = path;
    if (!path || !element.current || document.documentElement.dataset.keyboardNavigation) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
    const animation = element.current.animate(
      reduced
        ? [{ opacity: 0.85 }, { opacity: 1 }]
        : [
            { opacity: 0.85, transform: "translateY(4px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
      { duration: reduced ? 120 : 180, easing },
    );
    return () => animation.cancel();
  }, [path]);
  return (
    <div ref={element} className="page-transition">
      {children}
    </div>
  );
}

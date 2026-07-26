/** Shared motion helpers — respects prefers-reduced-motion. */

export const FLIP_ENTER_MS = 720;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollContainerToEnd(
  el: HTMLElement | null,
  smooth = true,
): void {
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: prefersReducedMotion() || !smooth ? "auto" : "smooth",
  });
}

export function afterFlipEnter(callback: () => void): void {
  if (prefersReducedMotion()) {
    callback();
    return;
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

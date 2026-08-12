/**
 * Pinned ScrollTrigger sections calculate their start/end offsets from the page's
 * layout at creation time. Web fonts swapping in late (or any other async layout
 * shift) can silently invalidate those offsets, making later pinned sections feel
 * broken — wrong trigger points, jumpy pins. Call this once per component that
 * creates a ScrollTrigger; it schedules a couple of safe re-measures.
 */
export function refreshOnSettle(scrollTrigger: { refresh: () => void }): void {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(() => scrollTrigger.refresh());
  }
  window.addEventListener("load", () => scrollTrigger.refresh(), { once: true });
}

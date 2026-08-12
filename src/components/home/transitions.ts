import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * The 02 → 03 hand-off: the GONE mark shrinks away while APP → COMPONENT → CODE → IDEA
 * stack-reveal underneath it, ending on the question that opens "What We Believe".
 */
export function setupGoneDisassembly(container: HTMLElement): void {
  const mark = container.querySelector<HTMLElement>("[data-disassembly-mark]");
  const labels = container.querySelectorAll<HTMLElement>("[data-disassembly-label]");
  const question = container.querySelector<HTMLElement>("[data-disassembly-question]");
  if (!mark || !question || labels.length === 0) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesktop = window.matchMedia("(min-width: 60rem)").matches;

  const apply = (progress: number) => {
    const markProgress = Math.min(1, progress / 0.3);
    mark.style.transform = `scale(${1 - markProgress * 0.6})`;
    mark.style.opacity = String(1 - markProgress * 0.7);

    labels.forEach((label, i) => {
      const start = 0.2 + (i / labels.length) * 0.6;
      const localProgress = Math.max(0, Math.min(1, (progress - start) / 0.15));
      label.style.opacity = String(localProgress);
      label.style.transform = `translateY(${(1 - localProgress) * 12}px)`;
    });

    const questionProgress = Math.max(0, Math.min(1, (progress - 0.82) / 0.18));
    question.style.opacity = String(questionProgress);
    question.style.transform = `translateY(${(1 - questionProgress) * 10}px)`;
  };

  if (reduceMotion || !isDesktop) {
    apply(1);
    return;
  }

  apply(0);
  ScrollTrigger.create({
    trigger: container,
    start: "top top",
    end: "+=100%",
    scrub: 0.6,
    pin: true,
    onUpdate: (self) => apply(self.progress),
  });
}

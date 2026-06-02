import { useEffect, useLayoutEffect, useRef } from "react";

/** Tailwind `md` breakpoint — hero stacks above wizard below this width. */
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

function scrollOnStepChange(target: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  if (isMobile && target) {
    target.scrollIntoView({ block: "start" });
    return;
  }

  window.scrollTo(0, 0);
}

/**
 * Resets scroll on wizard step changes. Step navigation often uses
 * `router.push({ scroll: false })`, so the browser keeps the old offset.
 *
 * On mobile, product pages stack a marketing hero above the wizard; scrolling
 * to (0, 0) leaves the form below the fold. When a root ref is provided,
 * mobile scrolls that anchor into view instead.
 */
export function useWizardStepScroll(currentStep: number) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof history === "undefined") return;
    const previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    return () => {
      history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = () => scrollOnStepChange(rootRef.current);
    run();
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
  }, [currentStep]);

  return rootRef;
}

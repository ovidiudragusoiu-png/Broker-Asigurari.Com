import { useEffect, useRef } from "react";
import { scrollToWizardAnchor } from "@/lib/hooks/scrollToWizardAnchor";

/**
 * Scrolls `ref` into view when `active` becomes true (e.g. form success screen).
 * Re-runs on the next frames so layout shifts after unmounting a long wizard still
 * land on the target, not a stale scroll offset that shows the page footer.
 */
export function useScrollIntoViewWhen(active: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const run = () => scrollToWizardAnchor(ref.current);
    run();
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
  }, [active]);

  return ref;
}

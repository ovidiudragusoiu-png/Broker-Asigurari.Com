/** Tailwind `md` breakpoint — hero stacks above wizard below this width. */
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

/**
 * Mobile: scroll anchor into view (hero + sticky header). Desktop: page top.
 */
export function scrollToWizardAnchor(target: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  if (isMobile && target) {
    target.scrollIntoView({ block: "start" });
    return;
  }

  window.scrollTo(0, 0);
}

import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Also used as the page-container ref so lazy screens start at the top when
// their content mounts after the route's initial layout effect.
export function resetPageScroll(element) {
  if (!element) return;
  if (typeof element.scrollTo === "function") {
    element.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } else {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }
}

export default function ScrollToTop() {
  const { key, pathname, search } = useLocation();
  useLayoutEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Navigation identity intentionally triggers the reset.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    for (const element of document.querySelectorAll("[data-page-scroll]")) {
      resetPageScroll(element);
    }
  }, [key, pathname, search]);
  return null;
}

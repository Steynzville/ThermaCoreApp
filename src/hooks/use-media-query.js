import * as React from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = React.useState(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => {
      setMatches(mediaQuery.matches);
    };
    mediaQuery.addEventListener("change", onChange);
    setMatches(mediaQuery.matches);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [query]);

  return !!matches;
}

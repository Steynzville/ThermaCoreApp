// Ensure global helper functions exist
global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

// Explicitly export testing helpers
export { fireEvent, render, screen, waitFor, cleanup };

// Global Orchestration Hooks
afterEach(() => {
  // 1. Unmount the React component tree to fire standard cleanup/useEffect unmounts
  cleanup();
  
  // 2. Force clean persistent Radix floating structural overlays stuck to document.body
  if (typeof document !== "undefined") {
    const floatingNodes = document.querySelectorAll([
      "[data-radix-portal]", 
      "[data-radix-focus-guard]", 
      "[data-radix-popper-content-wrapper]",
      '[role="dialog"]', 
      '[role="menu"]', 
      ".fixed"
    ].join(","));
    floatingNodes.forEach((el) => el.remove());
    document.body.innerHTML = "";
  }
  
  // 3. Temporarily cycle fake timers ONLY during teardown to flush out asynchronous leftovers
  try {
    vi.useFakeTimers();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  } catch (_e) {
    // Prevent teardown errors if timers were already manipulated inside a specific test file
    vi.useRealTimers();
  }
  
  vi.clearAllTimers();
  vi.clearAllMocks();
});

// Clean up entire module mapping references at the end of every test file suite
afterAll(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

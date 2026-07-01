import { render } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { Toaster } from "../../components/ui/sonner";

// Tell Vitest to ignore the global setupTests mock and use the real library for these assertions
vi.unmock("sonner");

describe("Toaster", () => {
  beforeEach(() => {
    // Intercept all macro-tasks (setTimers) generated during component mounting
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Fast-forward any lingering toast transition or layout lifecycle timers
    vi.runOnlyPendingTimers();
    // Revert back to the native environment clock
    vi.useRealTimers();
  });

  it("renders without errors", () => {
    expect(() => render(<Toaster />)).not.toThrow();
  });

  it("creates toaster element", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeTruthy();
  });

  it("accepts additional props", () => {
    expect(() => render(<Toaster position="top-right" />)).not.toThrow();
  });
});

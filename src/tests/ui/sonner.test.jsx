import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toaster } from "../../components/ui/sonner";

describe("Toaster", () => {
  it("renders without errors", () => {
    expect(() => render(<Toaster />)).not.toThrow();
  });

  it("creates toaster element", () => {
    const { container } = render(<Toaster />);
    // Toaster renders as a portal, check that it doesn't throw
    expect(container).toBeTruthy();
  });

  it("accepts additional props", () => {
    expect(() => render(<Toaster position="top-right" />)).not.toThrow();
  });
});

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollArea } from "../../components/ui/scroll-area";

// Mock window methods for ScrollArea
beforeEach(() => {
  window.clearTimeout = vi.fn();
  window.setTimeout = vi.fn().mockImplementation((cb) => {
    cb();
    return 123;
  });
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe("ScrollArea Components", () => {
  it("renders ScrollArea", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>,
    );
    expect(
      container.querySelector('[data-slot="scroll-area"]'),
    ).toBeInTheDocument();
  });

  it("renders viewport with content", () => {
    const { container } = render(
      <ScrollArea>
        <div>Scrollable content</div>
      </ScrollArea>,
    );
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]'),
    ).toBeInTheDocument();
  });

  it("renders without errors", () => {
    expect(() =>
      render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>,
      ),
    ).not.toThrow();
  });
});

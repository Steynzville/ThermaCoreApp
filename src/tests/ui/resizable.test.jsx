import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/ui/resizable";

// ✅ This test file doesn't need a global AbortController mock
// But we should ensure we don't inherit any from other tests

describe("Resizable Components", () => {
  beforeEach(() => {
    // No global mocks needed - this test should run clean
  });

  afterEach(() => {
    // Clean up any stray mocks
    vi.clearAllMocks();
  });

  it("renders ResizablePanelGroup", () => {
    const { container } = render(<ResizablePanelGroup />);
    expect(
      container.querySelector('[data-slot="resizable-panel-group"]'),
    ).toBeInTheDocument();
  });

  it("renders ResizablePanel", () => {
    const { container } = render(
      <ResizablePanelGroup>
        <ResizablePanel />
      </ResizablePanelGroup>,
    );
    expect(
      container.querySelector('[data-slot="resizable-panel"]'),
    ).toBeInTheDocument();
  });

  it("renders ResizableHandle", () => {
    const { container } = render(
      <ResizablePanelGroup>
        <ResizablePanel />
        <ResizableHandle />
        <ResizablePanel />
      </ResizablePanelGroup>,
    );
    expect(
      container.querySelector('[data-slot="resizable-handle"]'),
    ).toBeInTheDocument();
  });
});

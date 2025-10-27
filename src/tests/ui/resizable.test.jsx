import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/ui/resizable";

describe("Resizable Components", () => {
  it("renders ResizablePanelGroup", () => {
    const { container } = render(<ResizablePanelGroup />);
    expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeInTheDocument();
  });

  it("renders ResizablePanel", () => {
    const { container } = render(
      <ResizablePanelGroup>
        <ResizablePanel />
      </ResizablePanelGroup>
    );
    expect(container.querySelector('[data-slot="resizable-panel"]')).toBeInTheDocument();
  });

  it("renders ResizableHandle", () => {
    const { container } = render(
      <ResizablePanelGroup>
        <ResizablePanel />
        <ResizableHandle />
        <ResizablePanel />
      </ResizablePanelGroup>
    );
    expect(container.querySelector('[data-slot="resizable-handle"]')).toBeInTheDocument();
  });
});

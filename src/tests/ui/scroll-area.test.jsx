import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";

describe("ScrollArea Components", () => {
  it("renders ScrollArea", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
  });

  it("renders with vertical scrollbar", () => {
    const { container } = render(
      <ScrollArea>
        <div>Scrollable content</div>
      </ScrollArea>
    );
    expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeInTheDocument();
  });

  it("renders ScrollBar independently", () => {
    const { container} = render(<ScrollBar />);
    expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeInTheDocument();
  });
});

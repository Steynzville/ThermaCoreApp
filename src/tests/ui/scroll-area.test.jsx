import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollArea } from "../../components/ui/scroll-area";

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

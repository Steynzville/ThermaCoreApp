import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "../../components/ui/skeleton";

describe("Skeleton", () => {
  it("renders skeleton element", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toHaveClass("h-4", "w-20");
  });

  it("renders as a div element", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton.tagName).toBe("DIV");
  });
});

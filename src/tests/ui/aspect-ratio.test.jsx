import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AspectRatio } from "../../components/ui/aspect-ratio";

describe("AspectRatio", () => {
  it("renders with correct ratio", () => {
    const { container } = render(
      <AspectRatio ratio={16 / 9}>
        <img src="test.jpg" alt="test" />
      </AspectRatio>,
    );
    expect(
      container.querySelector('[data-slot="aspect-ratio"]'),
    ).toBeInTheDocument();
  });

  it("renders children correctly", () => {
    const { getByAltText } = render(
      <AspectRatio ratio={4 / 3}>
        <img src="test.jpg" alt="test image" />
      </AspectRatio>,
    );
    expect(getByAltText("test image")).toBeInTheDocument();
  });

  it("accepts additional props", () => {
    const { container } = render(
      <AspectRatio ratio={1} className="custom-class">
        <div>Content</div>
      </AspectRatio>,
    );
    expect(
      container.querySelector('[data-slot="aspect-ratio"]'),
    ).toBeInTheDocument();
  });
});

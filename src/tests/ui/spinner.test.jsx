/**
 * Spinner component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { Spinner } from "@/components/ui/spinner";

describe("Spinner", () => {
  it("renders an SVG with an accessible 'Loading' label", () => {
    render(<Spinner />);
    const svg = screen.getByRole("img", { name: "Loading" });
    expect(svg).toBeInTheDocument();
    expect(svg.tagName.toLowerCase()).toBe("svg");
  });

  it("includes a <title> element for assistive technology", () => {
    const { container } = render(<Spinner />);
    const title = container.querySelector("title");
    expect(title).toHaveTextContent("Loading");
  });

  it("defaults to the 'md' size (75x75 viewBox)", () => {
    render(<Spinner />);
    const svg = screen.getByRole("img", { name: "Loading" });
    expect(svg).toHaveAttribute("width", "75");
    expect(svg).toHaveAttribute("height", "75");
    expect(svg).toHaveAttribute("viewBox", "0 0 75 75");
  });

  describe("size variants", () => {
    const expectedDimensions = {
      sm: "50",
      md: "75",
      lg: "100",
      xl: "120",
    };

    it.each(Object.entries(expectedDimensions))(
      "renders the '%s' size at %spx",
      (size, dimension) => {
        render(<Spinner size={size} />);
        const svg = screen.getByRole("img", { name: "Loading" });
        expect(svg).toHaveAttribute("width", dimension);
        expect(svg).toHaveAttribute("height", dimension);
        expect(svg).toHaveAttribute(
          "viewBox",
          `0 0 ${dimension} ${dimension}`,
        );
      },
    );
  });

  it("renders three animated blue bars plus one animated outer ring", () => {
    const { container } = render(<Spinner />);
    const circles = container.querySelectorAll("circle");
    // outer golden ring + 3 blue bars + center dot = 5 circles
    expect(circles).toHaveLength(5);

    const animatedCircles = Array.from(circles).filter(
      (circle) => circle.querySelector("animateTransform, animate") !== null,
    );
    expect(animatedCircles.length).toBeGreaterThanOrEqual(4);
  });

  it("wraps the SVG in a container that accepts a custom className", () => {
    const { container } = render(<Spinner className="scada-loading-indicator" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("inline-block");
    expect(wrapper).toHaveClass("scada-loading-indicator");
  });

  it("spreads additional props onto the wrapping div", () => {
    render(<Spinner data-testid="spinner-wrapper" aria-hidden="false" />);
    const wrapper = screen.getByTestId("spinner-wrapper");
    expect(wrapper).toBeInTheDocument();
  });

  it("documents current behavior: an unrecognized size throws rather than falling back", () => {
    // sizeClasses has no entry for unknown keys, so destructuring
    // `{ width, height, outerRadius, innerRadius }` from `undefined` throws.
    // This test pins down that behavior so a future change to add a
    // graceful fallback is a deliberate, visible change to this suite.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Spinner size="huge" />)).toThrow();
    spy.mockRestore();
  });
});

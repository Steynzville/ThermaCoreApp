import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { Slider } from "../../components/ui/slider";

describe("Slider", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  it("renders slider component", () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it("renders with custom min and max", () => {
    const { container } = render(<Slider min={0} max={100} defaultValue={[25]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it("renders with array value", () => {
    const { container } = render(<Slider value={[20, 80]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });
});

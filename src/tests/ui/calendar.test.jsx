import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "../../components/ui/calendar";

describe("Calendar", () => {
  it("renders calendar component", () => {
    const { container } = render(<Calendar />);
    const calendar = container.querySelector(".rdp");
    expect(calendar).toBeInTheDocument();
  });

  it("renders with selected date", () => {
    const selected = new Date(2024, 0, 15);
    const { container } = render(<Calendar mode="single" selected={selected} />);
    expect(container.querySelector(".rdp")).toBeInTheDocument();
  });

  it("renders without errors", () => {
    expect(() => render(<Calendar />)).not.toThrow();
  });
});

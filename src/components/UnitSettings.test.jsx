import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnitSettings from "./UnitSettings";

// Mock UI components
vi.mock("./ui/card", () => ({
  Card: ({ children }) => <div>{children}</div>,
}));

describe("UnitSettings", () => {
  it("should render unit settings", () => {
    const { container } = render(<UnitSettings unitId={1} />);
    expect(container).toBeInTheDocument();
  });

  it("should accept unitId prop", () => {
    const { container } = render(<UnitSettings unitId={123} />);
    expect(container).toBeInTheDocument();
  });
});

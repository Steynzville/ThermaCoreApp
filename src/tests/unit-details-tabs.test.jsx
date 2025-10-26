/**
 * Tests for Unit Details Tab Components
 *
 * Tests for unit detail tab components.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UnitHistoryTab from "../components/unit-details/UnitHistoryTab";
import UnitStatusHeader from "../components/unit-details/UnitStatusHeader";

describe("UnitHistoryTab Component", () => {
  const mockUnit = {
    id: 1,
    name: "Test Unit",
    history: [],
  };

  it("should render without crashing", () => {
    const { container } = render(<UnitHistoryTab unit={mockUnit} />);
    expect(container).toBeTruthy();
  });
});

describe("UnitStatusHeader Component", () => {
  const mockUnit = {
    id: 1,
    name: "Test Unit",
    status: "running",
  };

  it("should render without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <UnitStatusHeader unit={mockUnit} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});

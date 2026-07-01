import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import UnitSettings from "../../components/settings/UnitSettings";

describe("UnitSettings", () => {
  const mockSettings = {
    units: {
      temperatureUnit: "celsius",
    },
  };

  const mockHandleSettingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Render once before each test to keep the DOM clean 
    // but avoid the overhead of re-mounting for every assertion
    render(
      React.createElement(UnitSettings, {
        settings: mockSettings,
        handleSettingChange: mockHandleSettingChange,
      })
    );
  });

  it("renders unit settings card with title", () => {
    expect(screen.getByText("Unit Settings")).toBeInTheDocument();
  });

  it("renders temperature unit select", () => {
    expect(screen.getByLabelText(/Temperature Unit/i)).toBeInTheDocument();
  });

  it("displays current temperature unit value", () => {
    const select = screen.getByLabelText(/Temperature Unit/i);
    expect(select).toHaveValue("celsius");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnitSettings from "../../components/settings/UnitSettings";

describe("UnitSettings", () => {
  const mockSettings = {
    units: {
      temperatureUnit: "celsius",
    },
  };

  const mockHandleSettingChange = vi.fn();

  it("renders unit settings card with title", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />,
    );
    expect(screen.getByText("Unit Settings")).toBeInTheDocument();
  });

  it("renders temperature unit select", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />,
    );
    expect(screen.getByLabelText(/Temperature Unit/i)).toBeInTheDocument();
  });

  it("displays current temperature unit value", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />,
    );
    const select = screen.getByLabelText(/Temperature Unit/i);
    expect(select).toHaveValue("celsius");
  });
});

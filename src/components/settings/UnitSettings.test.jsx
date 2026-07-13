import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import UnitSettings from "./UnitSettings";

describe("UnitSettings", () => {
  const mockSettings = {
    units: {
      temperatureUnit: "celsius",
    },
  };
  const mockHandleSettingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render unit settings with temperature selection", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    expect(screen.getByRole("heading", { name: "Unit Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Temperature Unit")).toBeInTheDocument();
    
    const select = screen.getByLabelText("Temperature Unit");
    expect(select.value).toBe("celsius");
  });

  it("should render the Globe icon", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );
    
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-5", "w-5", "text-blue-600");
  });

  it("should display both temperature unit options", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const select = screen.getByLabelText("Temperature Unit");
    const options = select.querySelectorAll("option");
    
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Celsius");
    expect(options[0]).toHaveValue("celsius");
    expect(options[1]).toHaveTextContent("Fahrenheit");
    expect(options[1]).toHaveValue("fahrenheit");
  });

  it("should display correct current unit selection", () => {
    const settingsWithFahrenheit = {
      units: {
        temperatureUnit: "fahrenheit",
      },
    };
    
    render(
      <UnitSettings
        settings={settingsWithFahrenheit}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const select = screen.getByLabelText("Temperature Unit");
    expect(select.value).toBe("fahrenheit");
  });

  it("should call handleSettingChange when changing the selected unit", async () => {
    const user = userEvent.setup();
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const select = screen.getByLabelText("Temperature Unit");
    await user.selectOptions(select, "fahrenheit");

    expect(mockHandleSettingChange).toHaveBeenCalledWith("units", "temperatureUnit", "fahrenheit");
  });

  it("should handle selection change with fireEvent", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const select = screen.getByLabelText("Temperature Unit");
    fireEvent.change(select, { target: { value: "fahrenheit" } });

    expect(mockHandleSettingChange).toHaveBeenCalledWith("units", "temperatureUnit", "fahrenheit");
  });

  it("should render with correct dark mode classes", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );
    
    const card = document.querySelector(".bg-white.dark\\:bg-gray-900");
    expect(card).toBeInTheDocument();
    
    const header = document.querySelector(".text-gray-900.dark\\:text-gray-100");
    expect(header).toBeInTheDocument();
  });

  it("should have select element with correct id", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const select = screen.getByLabelText("Temperature Unit");
    expect(select).toHaveAttribute("id", "temperatureUnit");
  });

  it("should handle multiple unit changes in sequence", async () => {
    const user = userEvent.setup();
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const select = screen.getByLabelText("Temperature Unit");
    
    await user.selectOptions(select, "fahrenheit");
    expect(mockHandleSettingChange).toHaveBeenCalledWith("units", "temperatureUnit", "fahrenheit");
    
    await user.selectOptions(select, "celsius");
    expect(mockHandleSettingChange).toHaveBeenCalledWith("units", "temperatureUnit", "celsius");
  });

  it("should have proper label-htmlFor association", () => {
    render(
      <UnitSettings
        settings={mockSettings}
        handleSettingChange={mockHandleSettingChange}
      />
    );

    const label = document.querySelector("label[htmlFor='temperatureUnit']");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("Temperature Unit");
  });
});

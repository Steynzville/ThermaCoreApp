import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DisplaySettings from "@/components/settings/DisplaySettings";

describe("DisplaySettings", () => {
  const defaultSettings = {
    display: {
      theme: "light",
    },
  };

  it("should render display settings", () => {
    const mockHandleChange = vi.fn();

    render(
      <DisplaySettings
        settings={defaultSettings}
        handleSettingChange={mockHandleChange}
      />,
    );

    expect(screen.getByText("Display")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("should change theme selection", () => {
    const mockHandleChange = vi.fn();

    render(
      <DisplaySettings
        settings={defaultSettings}
        handleSettingChange={mockHandleChange}
      />,
    );

    const themeSelect = screen.getByLabelText("Theme");
    fireEvent.change(themeSelect, { target: { value: "dark" } });

    expect(mockHandleChange).toHaveBeenCalledWith("display", "theme", "dark");
  });

  it("should show all theme options", () => {
    const mockHandleChange = vi.fn();

    render(
      <DisplaySettings
        settings={defaultSettings}
        handleSettingChange={mockHandleChange}
      />,
    );

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Auto (System)")).toBeInTheDocument();
  });

  it("should show correct initial theme value", () => {
    const mockHandleChange = vi.fn();

    render(
      <DisplaySettings
        settings={defaultSettings}
        handleSettingChange={mockHandleChange}
      />,
    );

    const themeSelect = screen.getByLabelText("Theme");
    expect(themeSelect).toHaveValue("light");
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import AudioSettings from "./AudioSettings";

// Mock the SettingsContext
const mockToggleSound = vi.fn();
const mockSetVolume = vi.fn();

let mockSettings = {
  soundEnabled: true,
  volume: 0.75,
};

vi.mock("../../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: mockSettings,
    toggleSound: mockToggleSound,
    setVolume: mockSetVolume,
  }),
}));

// Mock the local Switch wrapper (not @radix-ui/react-switch directly).
// A plain button with role="switch" reproduces Radix's real accessibility
// contract (role="switch", click -> onCheckedChange) without needing jsdom
// to support Radix's internal pointer/keyboard handling.
vi.mock("../ui/switch", () => ({
  Switch: ({ id, checked, onCheckedChange, disabled, className }) => (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      className={className}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
    />
  ),
}));

// Mock the local Slider wrapper (not @radix-ui/react-slider directly).
// This mirrors the controlled `value` prop AudioSettings actually passes,
// translating between the 0-1 volume scale and a 0-100 range input.
vi.mock("../ui/slider", () => ({
  Slider: ({ id, value, onValueChange, min = 0, max = 100, disabled, className }) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    const displayMin = Math.round(min * 100);
    const displayMax = Math.round(max * 100);
    const displayValue = Math.round((numericValue ?? 0) * 100);

    return (
      <div data-testid="slider-root" className={className}>
        <input
          id={id}
          type="range"
          min={displayMin}
          max={displayMax}
          value={displayValue}
          disabled={disabled}
          data-testid="slider-input"
          onChange={(e) => {
            const percent = parseInt(e.target.value, 10);
            onValueChange && onValueChange([percent / 100]);
          }}
        />
      </div>
    );
  },
}));

describe("AudioSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      soundEnabled: true,
      volume: 0.75,
    };
  });

  it("should render audio settings with correct content", () => {
    render(<AudioSettings />);

    expect(screen.getByRole("heading", { name: "Audio Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sound Effects")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByTestId("slider-root")).toBeInTheDocument();
  });

  it("should handle sound toggle with userEvent", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);

    const toggle = screen.getByRole("switch", { name: "Sound Effects" });
    await user.click(toggle);

    expect(mockToggleSound).toHaveBeenCalled();
  });

  it("should handle volume change", async () => {
    render(<AudioSettings />);

    const sliderInput = screen.getByTestId("slider-input");
    expect(sliderInput).toBeInTheDocument();
    expect(sliderInput).toHaveValue("75");
  });

  it("should show correct volume percentage when volume changes", async () => {
    mockSettings = {
      soundEnabled: true,
      volume: 0.5,
    };

    render(<AudioSettings />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should disable volume slider when sound is disabled", () => {
    mockSettings = {
      soundEnabled: false,
      volume: 0.75,
    };

    render(<AudioSettings />);
    const sliderInput = screen.getByTestId("slider-input");
    expect(sliderInput).toBeDisabled();
  });

  it("should call setVolume with correct value when slider changes", async () => {
    render(<AudioSettings />);

    const sliderInput = screen.getByTestId("slider-input");
    fireEvent.change(sliderInput, { target: { value: "50" } });

    await waitFor(() => {
      expect(mockSetVolume).toHaveBeenCalledWith(0.5);
    });
  });

  it("should render volume slider with correct min and max values", () => {
    render(<AudioSettings />);

    const sliderInput = screen.getByTestId("slider-input");
    expect(sliderInput).toHaveAttribute("min", "0");
    expect(sliderInput).toHaveAttribute("max", "100");
  });
});

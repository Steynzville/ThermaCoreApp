import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import AudioSettings from "./AudioSettings";

// Mock the SettingsContext
const mockToggleSound = vi.fn();
const mockSetVolume = vi.fn();

// Create a mock that can be updated between tests
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

// Mock the local Slider wrapper (not the raw @radix-ui/react-slider primitives).
// This keeps the test independent of how ui/slider.jsx forwards props to Radix,
// and lets us properly support the *controlled* `value` prop AudioSettings uses.
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
    // Reset to default settings
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
    // Check slider exists
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

    // Verify slider has correct initial value
    expect(sliderInput).toHaveValue("75");
  });

  it("should show correct volume percentage when volume changes", async () => {
    // Update mock settings for this test
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
    // The slider input should be disabled when sound is off
    const sliderInput = screen.getByTestId("slider-input");
    expect(sliderInput).toBeDisabled();
  });

  it("should call setVolume with correct value when slider changes", async () => {
    render(<AudioSettings />);

    const sliderInput = screen.getByTestId("slider-input");

    // Range inputs aren't well supported by userEvent's high-level API,
    // so fireEvent.change remains the pragmatic choice here.
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

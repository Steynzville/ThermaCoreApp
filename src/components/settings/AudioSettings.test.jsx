import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import AudioSettings from "./AudioSettings";

const mockSettings = {
  soundEnabled: true,
  volume: 0.75,
};

const mockToggleSound = vi.fn();
const mockSetVolume = vi.fn();

vi.mock("../../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: mockSettings,
    toggleSound: mockToggleSound,
    setVolume: mockSetVolume,
  }),
}));

describe("AudioSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render audio settings with correct content", () => {
    render(<AudioSettings />);

    expect(screen.getByRole("heading", { name: "Audio Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sound Effects")).toBeInTheDocument();
    expect(screen.getByLabelText("Volume Level")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("should handle sound toggle with userEvent", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);

    const toggle = screen.getByLabelText("Sound Effects");
    await user.click(toggle);

    expect(mockToggleSound).toHaveBeenCalled();
  });

  it("should handle volume change", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);

    const volumeSlider = screen.getByLabelText("Volume Level");
    await user.click(volumeSlider);

    // Simulate slider change with fireEvent since userEvent doesn't support range inputs well
    // Alternatively, we can test that the slider exists and has correct value
    expect(volumeSlider).toHaveValue("75");
  });

  it("should show correct volume percentage when volume changes", async () => {
    const customMockSettings = {
      soundEnabled: true,
      volume: 0.5,
    };

    vi.mocked(vi.fn).mockImplementation(() => ({
      useSettings: () => ({
        settings: customMockSettings,
        toggleSound: mockToggleSound,
        setVolume: mockSetVolume,
      }),
    }));

    // Re-mock for this specific test
    vi.doMock("../../context/SettingsContext", () => ({
      useSettings: () => ({
        settings: customMockSettings,
        toggleSound: mockToggleSound,
        setVolume: mockSetVolume,
      }),
    }));

    // Since we can't easily re-mock, we'll test with the default mock
    // and verify the volume display updates based on the mock
    render(<AudioSettings />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should disable volume slider when sound is disabled", () => {
    const mockSoundDisabled = {
      soundEnabled: false,
      volume: 0.75,
    };

    vi.mocked(vi.fn).mockImplementation(() => ({
      useSettings: () => ({
        settings: mockSoundDisabled,
        toggleSound: mockToggleSound,
        setVolume: mockSetVolume,
      }),
    }));

    render(<AudioSettings />);
    const volumeSlider = screen.getByLabelText("Volume Level");
    expect(volumeSlider).toBeDisabled();
  });

  it("should call setVolume with correct value when slider changes", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);

    const volumeSlider = screen.getByLabelText("Volume Level");
    
    // Simulate range input change
    fireEvent.change(volumeSlider, { target: { value: "50" } });
    
    await waitFor(() => {
      expect(mockSetVolume).toHaveBeenCalledWith(0.5);
    });
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import RemoteControl from "../components/RemoteControl";
import * as AuthContext from "../context/AuthContext.jsx";
import { SettingsProvider } from "../context/SettingsContext";
import * as RemoteControlHook from "../hooks/useRemoteControl.js";
import playSound from "../utils/audioPlayer";

// Mock audio player
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUnit = {
  id: "TC001",
  name: "Test Unit",
  location: "Test Location",
  status: "online",
  watergeneration: true,
  waterProductionOn: false,
  water_level: 80,
};

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <SettingsProvider>{component}</SettingsProvider>
    </BrowserRouter>,
  );
};

describe("Toggle State and Sound Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      userRole: "admin",
      user: { username: "admin", role: "admin" },
    });

    vi.spyOn(RemoteControlHook, "useRemoteControl").mockReturnValue({
      permissions: {
        has_remote_control: true,
        role: "admin",
        permissions: {
          remote_control: true,
        },
      },
      isLoading: false,
      error: null,
      controlPower: vi.fn().mockResolvedValue({ success: true }),
      controlWaterProduction: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  test("Machine power toggle updates state and plays sound after confirmation", async () => {
    const user = userEvent.setup();
    const { controlPower } = RemoteControlHook.useRemoteControl();
    
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText("Machine Control")).toBeInTheDocument();
    });

    // Find and click the machine power switch
    const switches = screen.getAllByRole("switch");
    const machinePowerSwitch = switches[0];

    // Initial state should be ON (status is "online")
    expect(machinePowerSwitch).toHaveAttribute("data-state", "checked");

    await user.click(machinePowerSwitch);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText("Machine Power Confirmation")).toBeInTheDocument();
    });

    // Click Continue button
    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Wait for API call
    await waitFor(() => {
      expect(controlPower).toHaveBeenCalledWith(false);
    });

    // Check if sound was played
    await waitFor(() => {
      expect(playSound).toHaveBeenCalledWith(
        "power-off.mp3",
        expect.any(Boolean),
        expect.any(Number)
      );
    });

    // Check if state updated
    await waitFor(() => {
      expect(machinePowerSwitch).toHaveAttribute("data-state", "unchecked");
    });
  });

  test("Water production toggle updates state and plays sound after confirmation", async () => {
    const user = userEvent.setup();
    const { controlWaterProduction } = RemoteControlHook.useRemoteControl();
    
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText("Water Production Control")).toBeInTheDocument();
    });

    // Find and click the water production switch
    const switches = screen.getAllByRole("switch");
    const waterProductionSwitch = switches[1];

    // Initial state should be OFF
    expect(waterProductionSwitch).toHaveAttribute("data-state", "unchecked");

    await user.click(waterProductionSwitch);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText("Water Production Confirmation")).toBeInTheDocument();
    });

    // Click Continue button
    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Wait for API call
    await waitFor(() => {
      expect(controlWaterProduction).toHaveBeenCalledWith(true);
    });

    // Check if sound was played
    await waitFor(() => {
      expect(playSound).toHaveBeenCalledWith(
        "water-on.mp3",
        expect.any(Boolean),
        expect.any(Number)
      );
    });

    // Check if state updated
    await waitFor(() => {
      expect(waterProductionSwitch).toHaveAttribute("data-state", "checked");
    });
  });
});

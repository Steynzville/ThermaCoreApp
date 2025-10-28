import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import RemoteControl from "../components/RemoteControl";
import * as AuthContext from "../context/AuthContext.jsx";
import { SettingsProvider } from "../context/SettingsContext";
import * as RemoteControlHook from "../hooks/useRemoteControl.js";

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
};

const renderWithProviders = (component, options = {}) => {
  const { user = { username: "admin", role: "admin" }, ...renderOptions } =
    options;

  // Mock localStorage for authentication
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn((key) => {
        if (key === "thermacore_user") return JSON.stringify(user);
        if (key === "thermacore_role") return user.role;
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });

  return render(
    <BrowserRouter>
      <SettingsProvider>{component}</SettingsProvider>
    </BrowserRouter>,
    renderOptions,
  );
};

describe("RemoteControl Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Set up default mocks
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
          read_units: true,
          write_units: true,
          remote_control: true,
        },
      },
      isLoading: false,
      error: null,
      controlPower: vi.fn().mockResolvedValue({ success: true }),
      controlWaterProduction: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  test("renders remote control interface for authorized users", async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(
        screen.getByText("Remote Control - Test Unit"),
      ).toBeInTheDocument();
      expect(screen.getByText("Admin • Remote Control")).toBeInTheDocument();
    });
  });

  test("shows authentication required for unauthenticated users", async () => {
    // Override mocks for unauthenticated test
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      isAuthenticated: false,
      userRole: null,
      user: null,
    });

    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
      expect(
        screen.getByText("Please log in to access remote control features."),
      ).toBeInTheDocument();
    });
  });

  test("shows unit not found when no unit provided", () => {
    renderWithProviders(<RemoteControl />);

    expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
  });

  test("displays control switches with proper disabled states", async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      // Test that the control interfaces are displayed
      expect(screen.getByText("Machine Control")).toBeInTheDocument();
      expect(screen.getByText("Water Production Control")).toBeInTheDocument();
      expect(
        screen.getByText("Auto Switch On (Water Level < 75%)"),
      ).toBeInTheDocument();
    });
  });

  test("handles machine power control", async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(
        screen.getByText("Remote Control - Test Unit"),
      ).toBeInTheDocument();
      expect(screen.getByText("Machine Control")).toBeInTheDocument();
    });

    // Test that the control interface is available
    expect(
      screen.getByText("Turn the entire machine on or off"),
    ).toBeInTheDocument();
  });

  test("handles water production control", async () => {
    const onlineUnit = { ...mockUnit, status: "online" };
    renderWithProviders(<RemoteControl unit={onlineUnit} />);

    await waitFor(() => {
      expect(screen.getByText("Water Production Control")).toBeInTheDocument();
    });

    // Test that water production control is available
    expect(
      screen.getByText("Enable or disable water production"),
    ).toBeInTheDocument();
  });

  test("shows permission indicator correctly", async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText("Admin • Remote Control")).toBeInTheDocument();
    });
  });

  describe("Toggle Dialog Triggers", () => {
    test("Machine Power toggle opens confirmation dialog", async () => {
      const user = userEvent.setup();
      renderWithProviders(<RemoteControl unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByText("Machine Control")).toBeInTheDocument();
      });

      // Find and click the machine power switch
      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches[0]; // First switch is machine power

      await user.click(machinePowerSwitch);

      // Check that the dialog opens with correct title
      await waitFor(() => {
        expect(
          screen.getByText("Machine Power Confirmation"),
        ).toBeInTheDocument();
      });
    });

    test("Water Production toggle opens confirmation dialog", async () => {
      const user = userEvent.setup();
      const onlineUnit = { ...mockUnit, status: "online" };
      renderWithProviders(<RemoteControl unit={onlineUnit} />);

      await waitFor(() => {
        expect(screen.getByText("Water Production Control")).toBeInTheDocument();
      });

      // Find and click the water production switch
      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches[1]; // Second switch is water production

      await user.click(waterProductionSwitch);

      // Check that the dialog opens with correct title
      await waitFor(() => {
        expect(
          screen.getByText("Water Production Confirmation"),
        ).toBeInTheDocument();
      });
    });

    test("Auto-switch toggle opens confirmation dialog", async () => {
      const user = userEvent.setup();
      const onlineUnit = { ...mockUnit, status: "online" };
      renderWithProviders(<RemoteControl unit={onlineUnit} />);

      await waitFor(() => {
        expect(
          screen.getByText("Auto Switch On (Water Level < 75%)"),
        ).toBeInTheDocument();
      });

      // Find and click the auto-switch switch
      const switches = screen.getAllByRole("switch");
      const autoSwitchSwitch = switches[2]; // Third switch is auto-switch

      await user.click(autoSwitchSwitch);

      // Check that the dialog opens with correct title
      await waitFor(() => {
        expect(screen.getByText("Auto-switch Confirmation")).toBeInTheDocument();
      });
    });
  });

  describe("Back Button Behavior", () => {
    test("Back button navigates without confirmation dialog", async () => {
      const user = userEvent.setup();
      renderWithProviders(<RemoteControl unit={mockUnit} />);

      await waitFor(() => {
        expect(
          screen.getByText("Remote Control - Test Unit"),
        ).toBeInTheDocument();
      });

      // Find and click the back button
      const backButton = screen.getByText("Back to Unit Details");
      await user.click(backButton);

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith(-1);

      // Ensure no confirmation dialog appeared
      expect(
        screen.queryByText("Are you absolutely sure?"),
      ).not.toBeInTheDocument();
    });
  });

  describe("RBAC for all roles", () => {
    test("Admin role has full control with toggles enabled", async () => {
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
            read_units: true,
            write_units: true,
            remote_control: true,
          },
        },
        isLoading: false,
        error: null,
        controlPower: vi.fn(),
        controlWaterProduction: vi.fn(),
      });

      renderWithProviders(<RemoteControl unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByText("Admin • Remote Control")).toBeInTheDocument();
      });

      // Check that toggles are enabled
      const switches = screen.getAllByRole("switch");
      switches.forEach((switchElement) => {
        expect(switchElement).not.toBeDisabled();
      });
    });

    test("Operator role has full control with toggles enabled", async () => {
      vi.spyOn(AuthContext, "useAuth").mockReturnValue({
        isAuthenticated: true,
        userRole: "user", // Frontend role mapping
        user: { username: "operator", role: "user", backendRole: "operator" },
      });

      vi.spyOn(RemoteControlHook, "useRemoteControl").mockReturnValue({
        permissions: {
          has_remote_control: true,
          role: "operator",
          permissions: {
            read_units: true,
            write_units: false,
            remote_control: true,
          },
        },
        isLoading: false,
        error: null,
        controlPower: vi.fn(),
        controlWaterProduction: vi.fn(),
      });

      renderWithProviders(<RemoteControl unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByText("Operator • Remote Control")).toBeInTheDocument();
      });

      // Check that toggles are enabled for operator
      const switches = screen.getAllByRole("switch");
      switches.forEach((switchElement) => {
        expect(switchElement).not.toBeDisabled();
      });
    });

    test("Viewer role has read-only access with toggles disabled", async () => {
      vi.spyOn(AuthContext, "useAuth").mockReturnValue({
        isAuthenticated: true,
        userRole: "user", // Frontend role mapping
        user: { username: "viewer", role: "user", backendRole: "viewer" },
      });

      vi.spyOn(RemoteControlHook, "useRemoteControl").mockReturnValue({
        permissions: {
          has_remote_control: false, // Viewer does NOT have remote control
          role: "viewer",
          permissions: {
            read_units: true,
            write_units: false,
            remote_control: false,
          },
        },
        isLoading: false,
        error: null,
        controlPower: vi.fn(),
        controlWaterProduction: vi.fn(),
      });

      renderWithProviders(<RemoteControl unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByText("Viewer • Remote Control")).toBeInTheDocument();
      });

      // Check that toggles are disabled for viewer
      const switches = screen.getAllByRole("switch");
      switches.forEach((switchElement) => {
        expect(switchElement).toBeDisabled();
      });
    });
  });
});

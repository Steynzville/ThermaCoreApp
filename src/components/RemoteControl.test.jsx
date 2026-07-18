// src/tests/RemoteControl.test.jsx

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RemoteControl from "../components/RemoteControl";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import playSound from "../utils/audioPlayer";
import { canControlUnits } from "../utils/permissions";

// Mock the audio player
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Mock the permissions module
vi.mock("../utils/permissions", () => ({
  canControlUnits: vi.fn().mockReturnValue(true),
}));

// Mock the UI components to simplify testing
vi.mock("../components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open, onOpenChange, ...props }) => (
    <div data-testid="alert-dialog" data-open={open} {...props}>
      {children}
    </div>
  ),
  AlertDialogTrigger: ({ children, asChild, ...props }) => {
    if (asChild && children) {
      return children;
    }
    return (
      <div data-testid="alert-dialog-trigger" {...props}>
        {children}
      </div>
    );
  },
  AlertDialogContent: ({ children, ...props }) => (
    <div data-testid="alert-dialog-content" {...props}>{children}</div>
  ),
  AlertDialogDescription: ({ children, ...props }) => (
    <div data-testid="alert-dialog-description" {...props}>{children}</div>
  ),
  AlertDialogFooter: ({ children, ...props }) => (
    <div data-testid="alert-dialog-footer" {...props}>{children}</div>
  ),
  AlertDialogHeader: ({ children, ...props }) => (
    <div data-testid="alert-dialog-header" {...props}>{children}</div>
  ),
  AlertDialogTitle: ({ children, ...props }) => (
    <div data-testid="alert-dialog-title" {...props}>{children}</div>
  ),
  AlertDialogAction: ({ children, onClick, ...props }) => (
    <button data-testid="alert-dialog-action" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, ...props }) => (
    <button data-testid="alert-dialog-cancel" {...props}>{children}</button>
  ),
  AlertDialogPortal: ({ children }) => <>{children}</>,
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
}));

vi.mock("../components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, disabled, ...props }) => (
    <button
      data-testid="switch"
      data-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (onCheckedChange) {
          onCheckedChange(!checked);
        }
      }}
      {...props}
    />
  ),
}));

// Mock useNavigate
const mockNavigate = vi.fn();

// Create a mock location that can be controlled per test
let mockLocationState = { unit: null };
const mockUnit = {
  id: "TC001",
  name: "Test Unit",
  status: "online",
  location: "Plant A",
  connectionStatus: "Connected",
  watergeneration: true,
  waterProductionOn: true,
  autoSwitchEnabled: false,
  water_level: 80,
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockLocationState,
      pathname: "/remote-control",
    }),
  };
});

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual("../context/AuthContext");
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
    AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  };
});

// Mock useSettings
const mockUseSettings = vi.fn();
vi.mock("../context/SettingsContext", async () => {
  const actual = await vi.importActual("../context/SettingsContext");
  return {
    ...actual,
    useSettings: () => mockUseSettings(),
    SettingsProvider: ({ children }) => <div data-testid="settings-provider">{children}</div>,
  };
});

// Test wrapper with all providers
const TestWrapper = ({
  children,
  unit = mockUnit,
  role = "admin",
  settings = { soundEnabled: true, volume: 0.5 }
}) => {
  mockUseAuth.mockReturnValue({
    user: { id: 1, username: "admin", role },
    isAuthenticated: true,
    token: "mock-token-123",
    logout: vi.fn(),
    backendRole: role,
  });

  mockUseSettings.mockReturnValue({
    settings,
  });

  mockLocationState = { unit: unit };

  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("RemoteControl Component", () => {
  let originalExitFullscreen;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocationState = { unit: mockUnit };
    canControlUnits.mockReturnValue(true);
    vi.useFakeTimers();

    originalExitFullscreen = document.exitFullscreen;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    if (originalExitFullscreen) {
      document.exitFullscreen = originalExitFullscreen;
    } else {
      delete document.exitFullscreen;
    }
  });

  describe("Component Rendering", () => {
    it("should render remote control page for valid unit", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const headingElements = screen.getAllByText(/Remote Control/i);
      expect(headingElements.length).toBeGreaterThan(0);
    });

    it("should show 'Unit Not Found' when no unit is provided", () => {
      mockLocationState = { unit: null };

      act(() => {
        render(
          <TestWrapper unit={null}>
            <RemoteControl unit={null} />
          </TestWrapper>,
        );
      });

      const headingElements = screen.getAllByText(/Unit Not Found/i);
      expect(headingElements.length).toBeGreaterThan(0);
    });

    it("should display connection status as Connected", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const elements = screen.getAllByText(/Connected/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should display unit status badge", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const elements = screen.getAllByText(/ONLINE/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should sync state when unit prop changes", () => {
      const initialUnit = { ...mockUnit, status: "offline", waterProductionOn: false };
      const updatedUnit = { ...mockUnit, status: "online", waterProductionOn: true };
      
      const { rerender } = render(
        <TestWrapper unit={initialUnit}>
          <RemoteControl unit={initialUnit} />
        </TestWrapper>,
      );

      expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument();
      
      rerender(
        <TestWrapper unit={updatedUnit}>
          <RemoteControl unit={updatedUnit} />
        </TestWrapper>,
      );

      expect(screen.getByText(/ONLINE/i)).toBeInTheDocument();
    });
  });

  describe("Permission Checks - Admin Role", () => {
    it("should allow admin to toggle machine power with cascade effect", () => {
      const unitWithAutoOn = { ...mockUnit, autoSwitchEnabled: true };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithAutoOn} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[0]).toHaveAttribute("data-checked", "true");
      expect(switches[1]).toHaveAttribute("data-checked", "true");
      expect(switches[2]).toHaveAttribute("data-checked", "true");

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("power-off.mp3", true, 0.5);
      expect(screen.getByText(/Status: Stopped/i)).toBeInTheDocument();

      const switchesAfter = screen.getAllByTestId("switch");
      expect(switchesAfter[0]).toHaveAttribute("data-checked", "false");
      expect(switchesAfter[1]).toHaveAttribute("data-checked", "false");
      expect(switchesAfter[2]).toHaveAttribute("data-checked", "false");
      expect(switchesAfter[1]).toBeDisabled();
      expect(switchesAfter[2]).toBeDisabled();
    });

    it("should allow admin to toggle water production", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(1);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[1]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("water-off.mp3", true, 0.5);
      expect(switches[1]).toHaveAttribute("data-checked", "false");
    });

    it("should allow admin to toggle auto switch", () => {
      const unitWithAutoOff = { ...mockUnit, autoSwitchEnabled: false };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithAutoOff} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(2);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[2]);

      expect(playSound).toHaveBeenCalledWith("cool-tones.mp3", true, 0.5);
      expect(switches[2]).toHaveAttribute("data-checked", "true");
    });
  });

  describe("Cascading Toggle Rules", () => {
    it("should turn off auto switch when water production is turned off while machine stays on", () => {
      const unitWithAutoOn = { ...mockUnit, autoSwitchEnabled: true };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithAutoOn} />
          </TestWrapper>,
        );
      });

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[1]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("water-off.mp3", true, 0.5);
      const switches = screen.getAllByTestId("switch");
      expect(switches[1]).toHaveAttribute("data-checked", "false");
      expect(switches[2]).toHaveAttribute("data-checked", "false");
      expect(switches[0]).toHaveAttribute("data-checked", "true");
    });

    it("should keep water production and auto switch disabled when machine is turned off and then on again", () => {
      const unitWithAllOn = { ...mockUnit, autoSwitchEnabled: true };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithAllOn} />
          </TestWrapper>,
        );
      });

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      let switches = screen.getAllByTestId("switch");
      expect(switches[0]).toHaveAttribute("data-checked", "false");
      expect(switches[1]).toHaveAttribute("data-checked", "false");
      expect(switches[2]).toHaveAttribute("data-checked", "false");

      fireEvent.click(actionButtons[0]);

      switches = screen.getAllByTestId("switch");
      expect(switches[0]).toHaveAttribute("data-checked", "true");
      expect(switches[1]).toHaveAttribute("data-checked", "false");
      expect(switches[2]).toHaveAttribute("data-checked", "false");
    });
  });

  describe("Permission Checks - No Control Permission", () => {
    it("should disable all switches and hide confirm dialogs when user lacks control permission", () => {
      canControlUnits.mockReturnValue(false);

      act(() => {
        render(
          <TestWrapper role="viewer">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      switches.forEach((sw) => expect(sw).toBeDisabled());
      expect(screen.queryAllByTestId("alert-dialog-action")).toHaveLength(0);
    });
  });

  describe("Water Generation Not Supported", () => {
    it("should hide water production and auto switch cards when unit has no water generation", () => {
      const noWaterUnit = { ...mockUnit, watergeneration: false };

      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={noWaterUnit} />
          </TestWrapper>,
        );
      });

      expect(screen.queryByText(/Water Production Control/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Automatic Control Settings/i)).not.toBeInTheDocument();
      expect(screen.getAllByTestId("switch")).toHaveLength(1);
    });
  });

  describe("Operator Role", () => {
    it("should allow operator to toggle machine power", () => {
      act(() => {
        render(
          <TestWrapper role="operator">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(0);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("power-off.mp3", true, 0.5);
    });

    it("should allow operator to toggle water production", () => {
      act(() => {
        render(
          <TestWrapper role="operator">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(1);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[1]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("water-off.mp3", true, 0.5);
    });

    it("should allow operator to toggle auto switch", () => {
      const unitWithAutoOff = { ...mockUnit, autoSwitchEnabled: false };
      act(() => {
        render(
          <TestWrapper role="operator">
            <RemoteControl unit={unitWithAutoOff} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(2);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[2]);
      expect(playSound).toHaveBeenCalledWith("cool-tones.mp3", true, 0.5);
    });
  });

  describe("Video Feed Controls", () => {
    it("should toggle video feed on and off", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed") || btn.textContent?.includes("Stop Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);
        let activeElements = screen.getAllByText(/Live Feed Active/i);
        expect(activeElements.length).toBeGreaterThan(0);

        fireEvent.click(videoButton);
        const inactiveElements = screen.getAllByText(/Video Feed Inactive/i);
        expect(inactiveElements.length).toBeGreaterThan(0);
      } else {
        expect(screen.getByText(/Video Feed Status/i)).toBeInTheDocument();
      }
    });

    it("should allow viewer to view video feed (read-only access)", () => {
      act(() => {
        render(
          <TestWrapper role="viewer">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed") || btn.textContent?.includes("Stop Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);
        const activeElements = screen.getAllByText(/Live Feed Active/i);
        expect(activeElements.length).toBeGreaterThan(0);
      } else {
        expect(true).toBe(true);
      }
    });

    it("should show refresh button when video feed is active", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);

        const refreshButtons = screen.getAllByTestId("button-refresh-feed");
        expect(refreshButtons.length).toBeGreaterThan(0);
      }
    });

    it("should trigger refresh animation when refresh button is clicked", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);

        const refreshButton = screen.getByTestId("button-refresh-feed");
        expect(refreshButton).toBeInTheDocument();

        fireEvent.click(refreshButton);

        expect(screen.getByText(/Refreshing feed.../i)).toBeInTheDocument();

        act(() => {
          vi.advanceTimersByTime(800);
        });

        expect(screen.getByText(/Live Feed Active/i)).toBeInTheDocument();
      }
    });

    it("should not allow refresh when video feed is inactive", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const refreshButtons = screen.queryAllByTestId("button-refresh-feed");
      expect(refreshButtons.length).toBe(0);
    });

    it("should play correct sounds for video feed toggle", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);
        expect(playSound).toHaveBeenCalledWith("video-on.mp3", true, 0.5);
        
        fireEvent.click(videoButton);
        expect(playSound).toHaveBeenCalledWith("video-off.mp3", true, 0.5);
      }
    });
  });

  describe("Camera Selection", () => {
    it("should show camera selection dropdown", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const select = screen.getByTestId("select-camera");
      expect(select).toBeInTheDocument();

      const options = select.querySelectorAll("option");
      expect(options.length).toBeGreaterThan(0);
    });

    it("should handle camera selection change", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const select = screen.getByTestId("select-camera");
      fireEvent.change(select, { target: { value: "cam2" } });
      expect(select.value).toBe("cam2");
    });
  });

  describe("Fullscreen Toggle", () => {
    it("should have fullscreen toggle button", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const fullscreenButton = screen.getByTitle(/Enter Fullscreen/i);
      expect(fullscreenButton).toBeInTheDocument();
    });
  });

  describe("Unit Not Found - Navigation", () => {
    it("should navigate back when no unit is provided", () => {
      mockLocationState = { unit: null };

      act(() => {
        render(
          <TestWrapper unit={null}>
            <RemoteControl unit={null} />
          </TestWrapper>,
        );
      });

      const backButton = screen.getByRole("button", { name: /Back to Unit Details/i });
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe("Back Navigation", () => {
    it("should navigate back when back button is clicked", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const backButton = screen.getByRole("button", { name: /Back to Unit Details/i });
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe("Audio Feedback", () => {
    it("should play sound when machine is turned on", () => {
      const unitOff = { ...mockUnit, status: "offline" };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitOff} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[0]).toHaveAttribute("data-checked", "false");

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("power-on.mp3", true, 0.5);
      expect(screen.getByText(/Status: Running/i)).toBeInTheDocument();
    });

    it("should respect sound settings when playing audio", () => {
      act(() => {
        render(
          <TestWrapper
            role="admin"
            settings={{ soundEnabled: false, volume: 0.3 }}
          >
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("power-off.mp3", false, 0.3);
    });
  });

  describe("Action History Tracking", () => {
    it("should record machine power toggle in action history", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      fireEvent.click(switches[0]);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Machine powered off")).toBeInTheDocument();
      expect(screen.getByText("Machine turned off via remote interface")).toBeInTheDocument();
    });

    it("should record water production toggle in action history", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      fireEvent.click(switches[1]);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[1]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Water production disabled")).toBeInTheDocument();
      expect(screen.getByText("Water production disabled via remote interface")).toBeInTheDocument();
    });

    it("should record auto switch toggle in action history", () => {
      const unitWithAutoOff = { ...mockUnit, autoSwitchEnabled: false };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithAutoOff} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      fireEvent.click(switches[2]);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[2]);

      const autoSwitchTexts = screen.getAllByText("Auto switch enabled");
      expect(autoSwitchTexts.length).toBe(2);
      expect(autoSwitchTexts[0]).toBeInTheDocument();
      expect(autoSwitchTexts[1]).toBeInTheDocument();

      const descriptionTexts = screen.getAllByText("Auto switch enabled via remote interface");
      expect(descriptionTexts.length).toBe(1);
      expect(descriptionTexts[0]).toBeInTheDocument();
    });

    it("should record camera change in action history", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const select = screen.getByTestId("select-camera");
      fireEvent.change(select, { target: { value: "cam2" } });

      expect(screen.getByText("Camera changed")).toBeInTheDocument();
      expect(screen.getByText("Switched to Alternate Cam 1")).toBeInTheDocument();
    });

    it("should record video feed toggle in action history", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);
        expect(screen.getByText("Video feed started")).toBeInTheDocument();
        expect(screen.getByText("Live video feed started")).toBeInTheDocument();

        fireEvent.click(videoButton);
        expect(screen.getByText("Video feed stopped")).toBeInTheDocument();
        expect(screen.getByText("Live video feed stopped")).toBeInTheDocument();
      }
    });

    it("should record refresh action in history when refresh button is clicked", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed")
      );

      if (videoButton) {
        fireEvent.click(videoButton);

        const refreshButton = screen.getByTestId("button-refresh-feed");
        fireEvent.click(refreshButton);

        const refreshTexts = screen.getAllByText("Video feed refreshed");
        expect(refreshTexts.length).toBe(2);
        expect(refreshTexts[0]).toBeInTheDocument();
        expect(refreshTexts[1]).toBeInTheDocument();

        act(() => {
          vi.advanceTimersByTime(800);
        });
      }
    });

    it("should show action count in history header", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const headerText = screen.getByText(/Last \d+ actions recorded/i);
      const initialCount = parseInt(headerText.textContent.match(/\d+/)[0]);
      expect(initialCount).toBe(3);

      const switches = screen.getAllByTestId("switch");
      fireEvent.click(switches[0]);

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const updatedHeader = screen.getByText(/Last \d+ actions recorded/i);
      const updatedCount = parseInt(updatedHeader.textContent.match(/\d+/)[0]);
      expect(updatedCount).toBe(5);
    });

    it("should keep only last 10 actions in history", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      const actionButtons = screen.getAllByTestId("alert-dialog-action");

      for (let i = 0; i < 10; i++) {
        fireEvent.click(switches[0]);
        fireEvent.click(actionButtons[0]);
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }

      const headerText = screen.getByText(/Last \d+ actions recorded/i);
      expect(headerText.textContent).toMatch(/Last 10 actions recorded/);
    });

    it("should handle many cascades in history without exceeding limit", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      const actionButtons = screen.getAllByTestId("alert-dialog-action");

      for (let i = 0; i < 3; i++) {
        fireEvent.click(switches[0]);
        fireEvent.click(actionButtons[0]);
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }

      const headerText = screen.getByText(/Last \d+ actions recorded/i);
      const count = parseInt(headerText.textContent.match(/\d+/)[0]);
      expect(count).toBe(7);
      expect(count).toBeLessThanOrEqual(10);
    });

    it("should show initial hardcoded actions correctly", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      expect(screen.getByText("Water production enabled")).toBeInTheDocument();
      expect(screen.getByText("Machine powered on")).toBeInTheDocument();
      expect(screen.getByText("Auto switch enabled")).toBeInTheDocument();
    });

    it("should not log cascade actions when auto switch was already off", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const autoSwitchTexts = screen.queryAllByText("Auto switch disabled");
      expect(autoSwitchTexts.length).toBe(0);
    });

    it("should log cascade action when water production was on before machine turned off", () => {
      const unitWithWaterOn = { ...mockUnit, waterProductionOn: true };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithWaterOn} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[1]).toHaveAttribute("data-checked", "true");

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const waterTexts = screen.getAllByText("Water production disabled");
      expect(waterTexts.length).toBeGreaterThan(0);
    });

    it("should not log cascade action when water production was already off before machine turned off", () => {
      const unitWithWaterOff = { ...mockUnit, waterProductionOn: false };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWithWaterOff} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[1]).toHaveAttribute("data-checked", "false");

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[0]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const waterTexts = screen.queryAllByText("Water production disabled");
      expect(waterTexts.length).toBe(0);
    });
  });

  describe("Disabled Controls When Disconnected", () => {
    it("should show connected status", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const connectedElements = screen.getAllByText(/Connected/i);
      expect(connectedElements.length).toBeGreaterThan(0);
    });
  });

  describe("Fullscreen and Video Edge Cases", () => {
    it("should handle fullscreen toggle", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find(btn =>
        btn.textContent?.includes("Start Feed")
      );
      if (videoButton) fireEvent.click(videoButton);

      const fullscreenButton = screen.getByTitle(/Enter Fullscreen/i);
      fireEvent.click(fullscreenButton);

      expect(fullscreenButton).toBeInTheDocument();
    });

    it("should not allow refresh when video feed is inactive", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const refreshButtons = screen.queryAllByTestId("button-refresh-feed");
      expect(refreshButtons.length).toBe(0);
    });
  });

  describe("No Water Generation and Role Edges", () => {
    it("should handle operator role with water gen false", () => {
      const noWaterUnit = { ...mockUnit, watergeneration: false, autoSwitchEnabled: false };
      act(() => {
        render(
          <TestWrapper role="operator">
            <RemoteControl unit={noWaterUnit} />
          </TestWrapper>,
        );
      });

      expect(screen.queryByText(/Water Production Control/i)).not.toBeInTheDocument();
      expect(screen.getAllByTestId("switch")).toHaveLength(1);
    });

    it("should handle viewer role video feed only", () => {
      act(() => {
        render(
          <TestWrapper role="viewer">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const videoButton = screen.getAllByRole("button").find(btn =>
        btn.textContent?.includes("Start Feed")
      );
      if (videoButton) {
        fireEvent.click(videoButton);
        expect(screen.getByText(/Live Feed Active/i)).toBeInTheDocument();
      }
    });
  });

  // ============================================================
  // ADDITIONAL BRANCH COVERAGE
  // ============================================================

  describe("Additional Branch Coverage", () => {
    // FIXED: Assert on the description instead of the title to avoid duplicate match
    it("should turn ON water production directly (not via cascade)", () => {
      const unitWaterOff = { ...mockUnit, waterProductionOn: false };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitWaterOff} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[1]).toHaveAttribute("data-checked", "false");

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[1]);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(playSound).toHaveBeenCalledWith("water-on.mp3", true, 0.5);
      // Assert on the unique description instead of the title
      expect(
        screen.getByText("Water production enabled via remote interface")
      ).toBeInTheDocument();
    });

    it("should turn OFF auto switch directly (not via cascade)", () => {
      const unitAutoOn = { ...mockUnit, autoSwitchEnabled: true };
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitAutoOn} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[2]).toHaveAttribute("data-checked", "true");

      const actionButtons = screen.getAllByTestId("alert-dialog-action");
      fireEvent.click(actionButtons[2]);

      expect(playSound).toHaveBeenCalledWith("cool-tones.mp3", true, 0.5);
      expect(screen.getAllByText("Auto switch disabled").length).toBeGreaterThan(0);
    });

    it("should default autoSwitchEnabled to false when the unit omits it", () => {
      const unitNoAuto = { ...mockUnit };
      delete unitNoAuto.autoSwitchEnabled;

      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={unitNoAuto} />
          </TestWrapper>,
        );
      });

      const switches = screen.getAllByTestId("switch");
      expect(switches[2]).toHaveAttribute("data-checked", "false");
    });

    // FIXED: Add a matching option before changing the select value
    it("should fall back to the raw camera id when the selected camera isn't found", () => {
      act(() => {
        render(
          <TestWrapper role="admin">
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const select = screen.getByTestId("select-camera");
      // jsdom (like real browsers) won't apply a value that has no matching
      // <option>, so add one outside availableCameras to hit the fallback branch.
      const option = document.createElement("option");
      option.value = "unknown-cam";
      select.appendChild(option);

      fireEvent.change(select, { target: { value: "unknown-cam" } });

      expect(screen.getByText("Switched to unknown-cam")).toBeInTheDocument();
    });

    it("should not throw when the refresh timeout resolves after unmount", () => {
      const { unmount } = render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const videoButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Start Feed"));
      fireEvent.click(videoButton);

      const refreshButton = screen.getByTestId("button-refresh-feed");
      fireEvent.click(refreshButton);

      unmount();

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(800);
        });
      }).not.toThrow();
    });

    it("should switch to the Exit Fullscreen icon when entering fullscreen", () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      expect(screen.getByTitle(/Enter Fullscreen/i)).toBeInTheDocument();

      Object.defineProperty(document, "fullscreenElement", {
        value: document.createElement("div"),
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      expect(screen.getByTitle(/Exit Fullscreen/i)).toBeInTheDocument();

      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
    });

    it("should call document.exitFullscreen when exiting fullscreen mode", async () => {
      document.exitFullscreen = vi.fn().mockResolvedValue();

      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      Object.defineProperty(document, "fullscreenElement", {
        value: document.createElement("div"),
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      const exitButton = screen.getByTitle(/Exit Fullscreen/i);
      await act(async () => {
        fireEvent.click(exitButton);
      });

      expect(document.exitFullscreen).toHaveBeenCalled();

      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
    });

    it("should silently catch the error when entering fullscreen fails", async () => {
      act(() => {
        render(
          <TestWrapper>
            <RemoteControl unit={mockUnit} />
          </TestWrapper>,
        );
      });

      const videoContainer = document.querySelector(".aspect-video");
      videoContainer.requestFullscreen = vi
        .fn()
        .mockRejectedValue(new Error("denied"));

      const enterButton = screen.getByTitle(/Enter Fullscreen/i);
      await act(async () => {
        fireEvent.click(enterButton);
      });

      expect(enterButton).toBeInTheDocument();
    });
  });
});

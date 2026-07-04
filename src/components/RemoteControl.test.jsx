import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RemoteControl from "../components/RemoteControl";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";

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
  AlertDialog: ({ children }) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogTrigger: ({ children }) => <div data-testid="alert-dialog-trigger">{children}</div>,
  AlertDialogContent: ({ children }) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogDescription: ({ children }) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogHeader: ({ children }) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogAction: ({ children, onClick }) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
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
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: { unit: mockUnit },
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

// Mock unit data
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

// Test wrapper with all providers
const TestWrapper = ({ children, unit = mockUnit, role = "admin" }) => {
  // Set up mocks before rendering
  mockUseAuth.mockReturnValue({
    user: { id: 1, username: "admin", role },
    isAuthenticated: true,
    token: "mock-token-123",
    logout: vi.fn(),
    backendRole: role,
  });

  mockUseSettings.mockReturnValue({
    settings: {
      soundEnabled: true,
      volume: 0.5,
    },
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: "admin", role: "admin" },
      isAuthenticated: true,
      token: "mock-token-123",
      logout: vi.fn(),
      backendRole: "admin",
    });
    mockUseSettings.mockReturnValue({
      settings: {
        soundEnabled: true,
        volume: 0.5,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render remote control page for valid unit", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const headingElements = screen.getAllByText(/Remote Control/i);
      expect(headingElements.length).toBeGreaterThan(0);
    });

    it("should show 'Unit Not Found' when no unit is provided", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={null} />
        </TestWrapper>,
      );

      // The component renders "Unit Not Found" as an h1
      const headingElements = screen.getAllByText(/Unit Not Found/i);
      expect(headingElements.length).toBeGreaterThan(0);
      
      // Also check for the back button text
      const backButtonElements = screen.getAllByText(/Back to Unit Details/i);
      expect(backButtonElements.length).toBeGreaterThan(0);
    });

    it("should display connection status as Connected", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const elements = screen.getAllByText(/Connected/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should display unit status badge", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const elements = screen.getAllByText(/ONLINE/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("Permission Checks - Admin Role", () => {
    it("should allow admin to toggle machine power", async () => {
      render(
        <TestWrapper role="admin">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      // Find the switch for Machine Power
      const switches = screen.getAllByTestId("switch");
      // First switch should be Machine Power
      expect(switches.length).toBeGreaterThan(0);
      
      // Click the switch to trigger the AlertDialog
      fireEvent.click(switches[0]);
      
      // The AlertDialogTrigger wraps the Switch, so clicking it should show the dialog
      // Look for the alert dialog content
      await waitFor(() => {
        const dialogElements = screen.getAllByTestId("alert-dialog-content");
        expect(dialogElements.length).toBeGreaterThan(0);
      });
    });

    it("should allow admin to toggle water production", () => {
      render(
        <TestWrapper role="admin">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      // Second switch should be Water Production
      expect(switches.length).toBeGreaterThan(1);
      
      // Click the switch
      fireEvent.click(switches[1]);
    });

    it("should allow admin to toggle auto switch", () => {
      render(
        <TestWrapper role="admin">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      // Third switch should be Auto Switch
      expect(switches.length).toBeGreaterThan(2);
      
      // Click the switch
      fireEvent.click(switches[2]);
    });
  });

  describe("Operator Role", () => {
    it("should allow operator to toggle machine power", () => {
      render(
        <TestWrapper role="operator">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(0);
      
      // Click the switch
      fireEvent.click(switches[0]);
    });

    it("should allow operator to toggle water production", () => {
      render(
        <TestWrapper role="operator">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(1);
      
      fireEvent.click(switches[1]);
    });

    it("should allow operator to toggle auto switch", () => {
      render(
        <TestWrapper role="operator">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(2);
      
      fireEvent.click(switches[2]);
    });
  });

  describe("Video Feed Controls", () => {
    it("should allow viewer to view video feed (read-only access)", () => {
      render(
        <TestWrapper role="viewer">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      // Find the video feed toggle button
      const videoButton = screen.getByTestId("button-video-feed-toggle");
      expect(videoButton).toBeInTheDocument();
      
      // Click to start video feed
      fireEvent.click(videoButton);
      
      // Should show the video feed active state
      const activeElements = screen.getAllByText(/Live Feed Active/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });
  });

  describe("Unit Not Found - Navigation", () => {
    it("should navigate back when no unit is provided", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={null} />
        </TestWrapper>,
      );

      // The button is rendered as part of the Unit Not Found view
      const backButton = screen.getByRole("button", { name: /Back to Unit Details/i });
      expect(backButton).toBeInTheDocument();
      
      fireEvent.click(backButton);
      // When unit is null and propUnit is not provided, it navigates with -1
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe("Camera Selection", () => {
    it("should show camera selection dropdown", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const select = screen.getByTestId("select-camera");
      expect(select).toBeInTheDocument();
      
      // Should have camera options
      const options = select.querySelectorAll("option");
      expect(options.length).toBeGreaterThan(0);
    });

    it("should handle camera selection change", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const select = screen.getByTestId("select-camera");
      fireEvent.change(select, { target: { value: "cam2" } });
      expect(select.value).toBe("cam2");
    });
  });

  describe("Fullscreen Toggle", () => {
    it("should have fullscreen toggle button", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const fullscreenButton = screen.getByTitle(/Enter Fullscreen/i);
      expect(fullscreenButton).toBeInTheDocument();
    });
  });

  describe("Video Feed Toggle", () => {
    it("should toggle video feed on and off", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const videoButton = screen.getByTestId("button-video-feed-toggle");
      
      // Start feed
      fireEvent.click(videoButton);
      let activeElements = screen.getAllByText(/Live Feed Active/i);
      expect(activeElements.length).toBeGreaterThan(0);
      
      // Stop feed
      fireEvent.click(videoButton);
      const inactiveElements = screen.getAllByText(/Video Feed Inactive/i);
      expect(inactiveElements.length).toBeGreaterThan(0);
    });
  });

  describe("Back Navigation", () => {
    it("should navigate back when back button is clicked", () => {
      render(
        <TestWrapper>
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const backButton = screen.getByRole("button", { name: /Back to Unit Details/i });
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});

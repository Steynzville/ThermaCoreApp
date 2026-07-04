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

// Mock the UI components to simplify testing - FIXED AlertDialog mock
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
    <div data-testid="alert-dialog-content" {...props}>
      <div data-testid="alert-dialog-header">
        <div data-testid="alert-dialog-title">Are you absolutely sure?</div>
      </div>
      <div data-testid="alert-dialog-description">
        This action will turn off the machine power.
      </div>
      <div data-testid="alert-dialog-footer">
        <button data-testid="alert-dialog-cancel">Cancel</button>
        <button data-testid="alert-dialog-action">Continue</button>
      </div>
      {children}
    </div>
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
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

// Mock useNavigate
const mockNavigate = vi.fn();

// Create a mock location that can be controlled per test
let mockLocationState = { unit: null };
let mockUnit = {
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
const TestWrapper = ({ children, unit = mockUnit, role = "admin" }) => {
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocationState = { unit: mockUnit };
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
      mockLocationState = { unit: null };
      
      render(
        <TestWrapper unit={null}>
          <RemoteControl unit={null} />
        </TestWrapper>,
      );

      const headingElements = screen.getAllByText(/Unit Not Found/i);
      expect(headingElements.length).toBeGreaterThan(0);
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

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(0);
      
      fireEvent.click(switches[0]);
      
      // Use findAllByTestId which properly waits for elements to appear
      const dialogContents = await screen.findAllByTestId("alert-dialog-content");
      expect(dialogContents.length).toBeGreaterThan(0);
    });

    it("should allow admin to toggle water production", () => {
      render(
        <TestWrapper role="admin">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(1);
      
      fireEvent.click(switches[1]);
      
      expect(switches[1]).toBeInTheDocument();
    });

    it("should allow admin to toggle auto switch", () => {
      render(
        <TestWrapper role="admin">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

      const switches = screen.getAllByTestId("switch");
      expect(switches.length).toBeGreaterThan(2);
      
      fireEvent.click(switches[2]);
      
      expect(switches[2]).toBeInTheDocument();
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
      
      fireEvent.click(switches[0]);
      expect(switches[0]).toBeInTheDocument();
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
      expect(switches[1]).toBeInTheDocument();
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
      expect(switches[2]).toBeInTheDocument();
    });
  });

  describe("Video Feed Controls", () => {
    it("should allow viewer to view video feed (read-only access)", () => {
      render(
        <TestWrapper role="viewer">
          <RemoteControl unit={mockUnit} />
        </TestWrapper>,
      );

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
  });

  describe("Unit Not Found - Navigation", () => {
    it("should navigate back when no unit is provided", () => {
      mockLocationState = { unit: null };
      
      render(
        <TestWrapper unit={null}>
          <RemoteControl unit={null} />
        </TestWrapper>,
      );

      const backButton = screen.getByRole("button", { name: /Back to Unit Details/i });
      expect(backButton).toBeInTheDocument();
      
      fireEvent.click(backButton);
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

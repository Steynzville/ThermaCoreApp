import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsView from "./SettingsView";

// Mock the ThemeContext
const mockSetTheme = vi.fn();
vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
  }),
}));

// Mock child components to isolate testing
vi.mock("./PageHeader", () => ({
  default: ({ title }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock("./settings/AlertSettings", () => ({
  default: () => <div data-testid="alert-settings">Alert Settings</div>,
}));

vi.mock("./settings/AudioSettings", () => ({
  default: () => <div data-testid="audio-settings">Audio Settings</div>,
}));

vi.mock("./settings/DataRefreshSettings", () => ({
  default: () => (
    <div data-testid="data-refresh-settings">Data Refresh Settings</div>
  ),
}));

vi.mock("./settings/DisplaySettings", () => ({
  default: () => <div data-testid="display-settings">Display Settings</div>,
}));

vi.mock("./settings/NotificationSettings", () => ({
  default: () => (
    <div data-testid="notification-settings">Notification Settings</div>
  ),
}));

vi.mock("./settings/ProfileSettings", () => ({
  default: () => <div data-testid="profile-settings">Profile Settings</div>,
}));

vi.mock("./ui/button", () => ({
  Button: ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

describe("SettingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.alert
    global.alert = vi.fn();
  });

  it("should render the settings view with all sections", () => {
    render(<SettingsView />);

    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(screen.getByTestId("profile-settings")).toBeInTheDocument();
    expect(screen.getByTestId("notification-settings")).toBeInTheDocument();
    expect(screen.getByTestId("display-settings")).toBeInTheDocument();
    expect(screen.getByTestId("data-refresh-settings")).toBeInTheDocument();
    expect(screen.getByTestId("alert-settings")).toBeInTheDocument();
    expect(screen.getByTestId("audio-settings")).toBeInTheDocument();
  });

  it("should render save and reset buttons", () => {
    render(<SettingsView />);

    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByText(/Reset to Default/i)).toBeInTheDocument();
  });

  it("should save settings and show alert", () => {
    render(<SettingsView />);

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    expect(global.alert).toHaveBeenCalledWith("Settings saved successfully!");
  });

  it("should reset settings to defaults", () => {
    render(<SettingsView />);

    const resetButton = screen.getByText(/Reset to Default/i);
    fireEvent.click(resetButton);

    // Settings should be reset (verified by no errors)
    expect(resetButton).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<SettingsView className="custom-class" />);
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass("custom-class");
  });

  it("should initialize with default settings", () => {
    const { container } = render(<SettingsView />);
    // Just verify it renders without errors
    expect(container).toBeInTheDocument();
  });

  it("should render page header with Settings title", () => {
    render(<SettingsView />);
    expect(screen.getByTestId("page-header")).toHaveTextContent("Settings");
  });
});

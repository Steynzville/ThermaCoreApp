import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  update: vi.fn(),
  theme: vi.fn(),
  settings: {
    soundEnabled: true,
    volume: 0.35,
    refreshInterval: 30000,
    temperatureUnit: "celsius",
  },
}));
vi.mock("../utils/apiFetch", () => ({ apiPutJson: mocks.save }));
vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark", setTheme: mocks.theme }),
}));
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: mocks.settings,
    updateSettings: mocks.update,
  }),
}));
vi.mock("./PageHeader", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("./settings/ProfileSettings", () => ({
  default: () => <div>Account profile</div>,
}));
vi.mock("./settings/ConnectedAccounts", () => ({
  default: () => <div>Connected accounts</div>,
}));
vi.mock("./settings/AudioSettings", () => ({
  default: () => <div>Audio settings</div>,
}));
vi.mock("./settings/PasswordSettings", () => ({
  default: () => <div>Password settings</div>,
}));
import SettingsView from "./SettingsView";
describe("persisted account settings", () => {
  beforeEach(() => vi.clearAllMocks());
  it("persists supported preferences before reporting success", async () => {
    mocks.save.mockResolvedValue({
      preferences: { ...mocks.settings, theme: "light" },
    });
    render(<SettingsView />);
    fireEvent.change(screen.getByLabelText("Theme"), {
      target: { value: "light" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByText("Account preferences saved.");
    expect(mocks.save).toHaveBeenCalledWith("/api/v1/account/settings", {
      preferences: { ...mocks.settings, theme: "light" },
    });
    expect(mocks.theme).toHaveBeenCalledWith("light");
    expect(screen.queryByText("Auto Backup")).not.toBeInTheDocument();
  });
  it("does not claim a successful save when persistence fails", async () => {
    mocks.save.mockRejectedValue(new Error("Backend unavailable"));
    render(<SettingsView />);
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Backend unavailable",
    );
    expect(
      screen.queryByText("Account preferences saved."),
    ).not.toBeInTheDocument();
    expect(mocks.theme).not.toHaveBeenCalled();
  });
  it("resets server preferences and changes the actual monitoring preference", async () => {
    mocks.save.mockResolvedValue({
      preferences: { ...mocks.settings, theme: "auto" },
    });
    render(<SettingsView />);
    fireEvent.change(screen.getByLabelText("Portfolio refresh interval"), {
      target: { value: "60000" },
    });
    expect(mocks.update).toHaveBeenCalledWith({ refreshInterval: 60000 });
    fireEvent.click(screen.getByRole("button", { name: "Reset to Default" }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith("/api/v1/account/settings", {
        preferences: { ...mocks.settings, theme: "auto" },
      }),
    );
  });
});

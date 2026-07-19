import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
// ✅ Updated import for co-located test file
import AdminLanding from "./AdminLanding";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../components/admin/TenantSwitcher", () => ({
  default: () => <div data-testid="tenant-switcher">Tenant Switcher</div>,
}));

vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, className }) => (
    <button
      data-testid="go-to-dashboard-button"
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

const mockUseAuth = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("AdminLanding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { name: "Admin User", firstName: "Admin", role: "admin" },
      isLoading: false,
    });
  });

  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    );
  };

  it("should render welcome message with user's first name", () => {
    renderWithRouter(<AdminLanding />);
    expect(screen.getByText(/Welcome back, Admin/)).toBeInTheDocument();
  });

  it("should fall back to user's name when firstName is not available", () => {
    mockUseAuth.mockReturnValue({
      user: { name: "Admin User", firstName: undefined, role: "admin" },
      isLoading: false,
    });
    renderWithRouter(<AdminLanding />);
    expect(screen.getByText(/Welcome back, Admin User/)).toBeInTheDocument();
  });

  it("should render tenant selection prompt", () => {
    renderWithRouter(<AdminLanding />);
    expect(
      screen.getByText(/Select the tenant you'd like to explore/)
    ).toBeInTheDocument();
  });

  it("should render tenant switcher", () => {
    renderWithRouter(<AdminLanding />);
    expect(screen.getByTestId("tenant-switcher")).toBeInTheDocument();
  });

  it("should render Go to Dashboard button", () => {
    renderWithRouter(<AdminLanding />);
    expect(screen.getByTestId("go-to-dashboard-button")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
  });

  it("should navigate to dashboard when Go to Dashboard button is clicked", () => {
    renderWithRouter(<AdminLanding />);
    const button = screen.getByTestId("go-to-dashboard-button");
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("should set tenant_selected flag when Go to Dashboard is clicked", () => {
    renderWithRouter(<AdminLanding />);
    const button = screen.getByTestId("go-to-dashboard-button");
    fireEvent.click(button);
    expect(sessionStorage.getItem("tenant_selected")).toBe("true");
  });

  it("should fall back to 'Admin' when no user object is provided", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });
    renderWithRouter(<AdminLanding />);
    expect(screen.getByText(/Welcome back, Admin!/)).toBeInTheDocument();
  });

  it("should have Go to Dashboard button always enabled for demo", () => {
    renderWithRouter(<AdminLanding />);
    const button = screen.getByTestId("go-to-dashboard-button");
    expect(button).not.toBeDisabled();
  });

  it("should handle sessionStorage errors gracefully with query param fallback", () => {
    // Mock sessionStorage.setItem to throw
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = vi.fn(() => {
      throw new Error("Storage error");
    });

    renderWithRouter(<AdminLanding />);
    const button = screen.getByTestId("go-to-dashboard-button");
    fireEvent.click(button);

    // Should navigate with query param fallback
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard?tenant_selected=true", { replace: true });

    // Restore
    sessionStorage.setItem = originalSetItem;
  });
});

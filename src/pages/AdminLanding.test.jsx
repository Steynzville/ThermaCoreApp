import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
// ✅ Updated import for co-located test file
import AdminLanding from "./AdminLanding";
import { TenantProvider } from "../context/TenantContext";
import { AuthProvider } from "../context/AuthContext";

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
  Button: ({ children, onClick, disabled, className }) => (
    <button
      data-testid="go-to-dashboard-button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

const mockUseTenant = vi.fn();
vi.mock("../context/TenantContext", () => ({
  useTenant: () => mockUseTenant(),
  TenantProvider: ({ children }) => <div>{children}</div>,
}));

const mockUseAuth = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe("AdminLanding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { name: "Admin User", firstName: "Admin", role: "admin" },
      isLoading: false,
    });
    mockUseTenant.mockReturnValue({
      currentTenant: null,
      availableTenants: [
        { id: "1", name: "Tenant One" },
        { id: "2", name: "Tenant Two" },
      ],
    });
  });

  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>{ui}</TenantProvider>
        </AuthProvider>
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

  // ✅ UPDATED: No longer auto-redirects - uses "Go to Dashboard" button
  it("should render Go to Dashboard button", () => {
    renderWithRouter(<AdminLanding />);
    expect(screen.getByTestId("go-to-dashboard-button")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
  });

  // ✅ NEW: Test that clicking the button navigates
  it("should navigate to dashboard when Go to Dashboard button is clicked", () => {
    renderWithRouter(<AdminLanding />);
    const button = screen.getByTestId("go-to-dashboard-button");
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  // ✅ UPDATED: No longer auto-redirects when tenant is selected
  it("should NOT auto-redirect when tenant is selected (requires button click)", () => {
    mockUseTenant.mockReturnValue({
      currentTenant: { id: "1", name: "Tenant One" },
      availableTenants: [{ id: "1", name: "Tenant One" }],
    });
    renderWithRouter(<AdminLanding />);
    // Should NOT auto-redirect
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should fall back to 'Admin' when no user object is provided", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });
    renderWithRouter(<AdminLanding />);
    expect(screen.getByText(/Welcome back, Admin!/)).toBeInTheDocument();
  });

  it("should not redirect when currentTenant is null", () => {
    mockUseTenant.mockReturnValue({
      currentTenant: null,
      availableTenants: [
        { id: "1", name: "Tenant One" },
        { id: "2", name: "Tenant Two" },
      ],
    });
    renderWithRouter(<AdminLanding />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
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

  it("should redirect to dashboard when tenant is selected", () => {
    mockUseTenant.mockReturnValue({
      currentTenant: { id: "1", name: "Tenant One" },
      availableTenants: [{ id: "1", name: "Tenant One" }],
    });
    renderWithRouter(<AdminLanding />);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
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

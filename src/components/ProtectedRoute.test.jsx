import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ProtectedRoute from "./ProtectedRoute";

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock SideNavigation
vi.mock("./SideNavigation", () => ({
  default: ({ userRole }) => (
    <div data-testid="side-navigation" data-role={userRole}>
      Side Navigation
    </div>
  ),
}));

// Mock Spinner
vi.mock("./ui/spinner", () => ({
  Spinner: ({ size, className }) => (
    <div data-testid="spinner" data-size={size} className={className}>
      Loading spinner
    </div>
  ),
}));

// Mock permissions
vi.mock("../utils/permissions", () => ({
  getFrontendRole: vi.fn((role) => {
    if (role === "admin" || role === "superadmin") return "admin";
    if (role === "operator") return "operator";
    if (role === "viewer") return "viewer";
    return "viewer";
  }),
}));

// Mock components for testing
const MockComponent = ({ userRole, ...props }) => (
  <div data-testid="mock-component" data-role={userRole} data-props={JSON.stringify(props)}>
    Protected Content
  </div>
);

const MockAdminComponent = ({ userRole }) => (
  <div data-testid="admin-component" data-role={userRole}>
    Admin Content
  </div>
);

const MockOperatorComponent = ({ userRole }) => (
  <div data-testid="operator-component" data-role={userRole}>
    Operator Content
  </div>
);

const MockViewerComponent = ({ userRole }) => (
  <div data-testid="viewer-component" data-role={userRole}>
    Viewer Content
  </div>
);

// Test wrapper with routes
const renderWithRouter = (ui, initialEntries = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        <Route path="/protected" element={ui} />
        <Route path="/" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading spinner while authenticating", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      userRole: null,
      isLoading: true,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={[]} />
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-component")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("should redirect to login if not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={[]} />
    );

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-component")).not.toBeInTheDocument();
    expect(screen.queryByTestId("side-navigation")).not.toBeInTheDocument();
  });

  it("should render component and sidebar when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "admin",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={[]} />
    );

    expect(screen.getByTestId("mock-component")).toBeInTheDocument();
    expect(screen.getByTestId("side-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("side-navigation")).toHaveAttribute("data-role", "admin");
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("should pass props to the rendered component", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "operator",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute 
        component={MockComponent} 
        roles={[]}
        customProp="test-value"
        anotherProp={123}
      />
    );

    const component = screen.getByTestId("mock-component");
    expect(component).toBeInTheDocument();
    expect(component).toHaveAttribute("data-role", "operator");
    const props = JSON.parse(component.getAttribute("data-props"));
    expect(props.customProp).toBe("test-value");
    expect(props.anotherProp).toBe(123);
  });

  it("should allow access when user has required role", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "admin",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={["admin"]} />
    );

    expect(screen.getByTestId("mock-component")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("should deny access when user lacks required role", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "operator",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={["admin"]} />
    );

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-component")).not.toBeInTheDocument();
  });

  it("should allow access with multiple roles", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "operator",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={["admin", "operator"]} />
    );

    expect(screen.getByTestId("mock-component")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });

  it("should use componentMap to select role-based component", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "operator",
      isLoading: false,
    });

    const componentMap = {
      admin: MockAdminComponent,
      operator: MockOperatorComponent,
      viewer: MockViewerComponent,
    };

    renderWithRouter(
      <ProtectedRoute 
        component={MockComponent} 
        componentMap={componentMap}
        roles={["admin", "operator", "viewer"]}
      />
    );

    expect(screen.getByTestId("operator-component")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-component")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-component")).not.toBeInTheDocument();
  });

  it("should render admin component for admin user", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "admin",
      isLoading: false,
    });

    const componentMap = {
      admin: MockAdminComponent,
      operator: MockOperatorComponent,
      viewer: MockViewerComponent,
    };

    renderWithRouter(
      <ProtectedRoute 
        component={MockComponent} 
        componentMap={componentMap}
        roles={["admin", "operator", "viewer"]}
      />
    );

    expect(screen.getByTestId("admin-component")).toBeInTheDocument();
    expect(screen.queryByTestId("operator-component")).not.toBeInTheDocument();
  });

  it("should render viewer component for viewer user", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "viewer",
      isLoading: false,
    });

    const componentMap = {
      admin: MockAdminComponent,
      operator: MockOperatorComponent,
      viewer: MockViewerComponent,
    };

    renderWithRouter(
      <ProtectedRoute 
        component={MockComponent} 
        componentMap={componentMap}
        roles={["admin", "operator", "viewer"]}
      />
    );

    expect(screen.getByTestId("viewer-component")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-component")).not.toBeInTheDocument();
    expect(screen.queryByTestId("operator-component")).not.toBeInTheDocument();
  });

  it("should fallback to dashboard if no component found for role", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "unknown-role",
      isLoading: false,
    });

    const componentMap = {
      admin: MockAdminComponent,
      operator: MockOperatorComponent,
    };

    renderWithRouter(
      <ProtectedRoute 
        component={MockComponent} 
        componentMap={componentMap}
        roles={[]}
      />
    );

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-component")).not.toBeInTheDocument();
  });

  it("should fallback to dashboard if no Component or componentMap provided", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "admin",
      isLoading: false,
    });

    // @ts-ignore - intentionally testing missing props
    renderWithRouter(<ProtectedRoute roles={[]} />);

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("should handle superadmin role correctly", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "superadmin",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={["admin"]} />
    );

    // superadmin should be treated as admin via getFrontendRole
    expect(screen.getByTestId("mock-component")).toBeInTheDocument();
  });

  it("should pass userRole to the rendered component", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "operator",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={[]} />
    );

    const component = screen.getByTestId("mock-component");
    expect(component).toHaveAttribute("data-role", "operator");
  });

  it("should render side navigation with userRole", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "viewer",
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute component={MockComponent} roles={[]} />
    );

    expect(screen.getByTestId("side-navigation")).toHaveAttribute("data-role", "viewer");
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "../components/ProtectedRoute";

// Mock EnhancedSideNavigation
vi.mock("../components/SideNavigation", () => ({
  default: () => <div data-testid="side-nav">SideNav</div>,
}));

const DummyComponent = () => <div data-testid="protected-content">Protected Content</div>;

// Mock the AuthContext module
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthContext: {
    Provider: ({ children, value }) => {
      // We need to make the auth value available to useAuth
      // but since we're mocking useAuth directly, we just render children
      return children;
    },
    Consumer: ({ children }) => children({}),
  },
}));

// Import useAuth after mocking so we can control it
import { useAuth, AuthContext } from "../context/AuthContext";

describe("ProtectedRoute", () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders content for client_admin role", () => {
    // Mock useAuth to return client_admin values
    useAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "client_admin",
      isLoading: false,
    });

    const authValue = {
      isAuthenticated: true,
      userRole: "client_admin",
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  component={DummyComponent}
                  roles={["admin", "client_admin"]}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("redirects unauthorized user to dashboard", () => {
    // Mock useAuth to return viewer role
    useAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: "viewer",
      isLoading: false,
    });

    const authValue = {
      isAuthenticated: true,
      userRole: "viewer",
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  component={DummyComponent}
                  roles={["admin", "client_admin"]}
                />
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading is true", () => {
    // Mock useAuth to return loading state
    useAuth.mockReturnValue({
      isAuthenticated: false,
      userRole: null,
      isLoading: true,
    });

    const authValue = {
      isAuthenticated: false,
      userRole: null,
      isLoading: true,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  component={DummyComponent}
                  roles={["admin", "client_admin"]}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    // Mock useAuth to return unauthenticated
    useAuth.mockReturnValue({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });

    const authValue = {
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  component={DummyComponent}
                  roles={["admin", "client_admin"]}
                />
              }
            />
            <Route path="/login" element={<div data-testid="login">Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId("login")).toBeInTheDocument();
  });
});

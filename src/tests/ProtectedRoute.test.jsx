import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthContext } from "../context/AuthContext";

// Mock EnhancedSideNavigation
vi.mock("../components/SideNavigation", () => ({
  default: () => <div data-testid="side-nav">SideNav</div>,
}));

const DummyComponent = () => <div data-testid="protected-content">Protected Content</div>;

// AuthContext is the default export from AuthContext
// We need to mock it properly
vi.mock("../context/AuthContext", () => ({
  AuthContext: {
    Provider: ({ children, value }) => {
      // Render children with context value
      return children;
    },
    Consumer: ({ children }) => children({}),
  },
  useAuth: vi.fn(),
}));

describe("ProtectedRoute", () => {
  it("renders content for client_admin role", () => {
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
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminRoute from "../../../components/admin/AdminRoute";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }) => {
      mockNavigate(to);
      return <div>Redirecting to {to}</div>;
    },
  };
});

vi.mock("../../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../../context/AuthContext";

describe("AdminRoute", () => {
  it("should render children for admin users", () => {
    useAuth.mockReturnValue({
      user: { role: "admin" },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });

  it("should redirect non-admin users to dashboard", () => {
    useAuth.mockReturnValue({
      user: { role: "user" },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("should redirect unauthenticated users to dashboard", () => {
    useAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("should show loading spinner while loading", () => {
    useAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

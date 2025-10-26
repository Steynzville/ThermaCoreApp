import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPage from "./ReportsPage";

// Mock the components
vi.mock("../components/ReportsView", () => ({
  default: () => <div data-testid="reports-view">Reports View</div>,
}));

vi.mock("../components/UserReportsView", () => ({
  default: () => <div data-testid="user-reports-view">User Reports View</div>,
}));

// Mock the AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render ReportsView for admin users", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-view")).toBeInTheDocument();
    expect(screen.queryByTestId("user-reports-view")).not.toBeInTheDocument();
  });

  it("should render UserReportsView for non-admin users", () => {
    useAuth.mockReturnValue({ userRole: "user" });
    render(<ReportsPage />);
    expect(screen.getByTestId("user-reports-view")).toBeInTheDocument();
    expect(screen.queryByTestId("reports-view")).not.toBeInTheDocument();
  });

  it("should render UserReportsView for technician role", () => {
    useAuth.mockReturnValue({ userRole: "technician" });
    render(<ReportsPage />);
    expect(screen.getByTestId("user-reports-view")).toBeInTheDocument();
  });

  it("should render with proper wrapper div", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    const { container } = render(<ReportsPage />);
    expect(container.firstChild).toHaveClass("w-full");
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ReportsPage from "./ReportsPage";
import { useAuth } from "../context/AuthContext";

// 1. Mock components using React.createElement factories
vi.mock("../components/ReportsView", () => ({
  default: () => React.createElement("div", { "data-testid": "reports-view" }, "Reports View"),
}));

vi.mock("../components/UserReportsView", () => ({
  default: () => React.createElement("div", { "data-testid": "user-reports-view" }, "User Reports View"),
}));

// 2. Mock the AuthContext hook
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render ReportsView for admin users", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(React.createElement(ReportsPage));
    expect(screen.getByTestId("reports-view")).toBeInTheDocument();
    expect(screen.queryByTestId("user-reports-view")).not.toBeInTheDocument();
  });

  it("should render UserReportsView for non-admin users", () => {
    useAuth.mockReturnValue({ userRole: "user" });
    render(React.createElement(ReportsPage));
    expect(screen.getByTestId("user-reports-view")).toBeInTheDocument();
    expect(screen.queryByTestId("reports-view")).not.toBeInTheDocument();
  });

  it("should render UserReportsView for technician role", () => {
    useAuth.mockReturnValue({ userRole: "technician" });
    render(React.createElement(ReportsPage));
    expect(screen.getByTestId("user-reports-view")).toBeInTheDocument();
  });

  it("should render with proper wrapper div", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    const { container } = render(React.createElement(ReportsPage));
    expect(container.firstChild).toHaveClass("w-full");
  });
});

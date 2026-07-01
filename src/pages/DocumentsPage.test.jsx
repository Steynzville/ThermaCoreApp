import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import DocumentsPage from "./DocumentsPage";
import { useAuth } from "../context/AuthContext";

// 1. Mock constants cleanly by protecting the factory return structure
vi.mock("../constants/documents", () => {
  return {
    default: [
      {
        id: 1,
        name: "Admin Manual",
        description: "Administrator guide",
        url: "/docs/admin.pdf",
        allowedRoles: ["admin"],
      },
      {
        id: 2,
        name: "User Guide",
        description: "Basic user guide",
        url: "/docs/user.pdf",
        allowedRoles: ["admin", "user", "technician"],
      },
      {
        id: 3,
        name: "Technical Manual",
        description: "Technical documentation",
        url: "/docs/tech.pdf",
        allowedRoles: ["admin", "technician"],
      },
    ],
  };
});

// 2. Clear context mock tracking hook
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("DocumentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render page header", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(React.createElement(DocumentsPage));
    expect(screen.getByText("Documents & Resources")).toBeInTheDocument();
    expect(
      screen.getByText("Access important documents, manuals, and resources"),
    ).toBeInTheDocument();
  });

  it("should show all documents for admin users", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(React.createElement(DocumentsPage));
    expect(screen.getByText("Admin Manual")).toBeInTheDocument();
    expect(screen.getByText("User Guide")).toBeInTheDocument();
    expect(screen.getByText("Technical Manual")).toBeInTheDocument();
  });

  it("should filter documents for regular users", () => {
    useAuth.mockReturnValue({ userRole: "user" });
    render(React.createElement(DocumentsPage));
    expect(screen.queryByText("Admin Manual")).not.toBeInTheDocument();
    expect(screen.getByText("User Guide")).toBeInTheDocument();
    expect(screen.queryByText("Technical Manual")).not.toBeInTheDocument();
  });

  it("should show appropriate documents for technician role", () => {
    useAuth.mockReturnValue({ userRole: "technician" });
    render(React.createElement(DocumentsPage));
    expect(screen.queryByText("Admin Manual")).not.toBeInTheDocument();
    expect(screen.getByText("User Guide")).toBeInTheDocument();
    expect(screen.getByText("Technical Manual")).toBeInTheDocument();
  });

  it("should show no documents message when no documents match user role", () => {
    useAuth.mockReturnValue({ userRole: "guest" });
    render(React.createElement(DocumentsPage));
    expect(screen.getByText("No Documents Available")).toBeInTheDocument();
    expect(
      screen.getByText("No documents are available for your current role."),
    ).toBeInTheDocument();
  });

  it("should render document links with correct attributes", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(React.createElement(DocumentsPage));
    const link = screen.getByText("Admin Manual").closest("a");
    expect(link).toHaveAttribute("href", "/docs/admin.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should render document descriptions", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(React.createElement(DocumentsPage));
    expect(screen.getByText("Administrator guide")).toBeInTheDocument();
    expect(screen.getByText("Basic user guide")).toBeInTheDocument();
    expect(screen.getByText("Technical documentation")).toBeInTheDocument();
  });

  it("should render Available Documents heading when documents exist", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    render(React.createElement(DocumentsPage));
    expect(screen.getByText("Available Documents")).toBeInTheDocument();
  });

  it("should have proper styling classes", () => {
    useAuth.mockReturnValue({ userRole: "admin" });
    const { container } = render(React.createElement(DocumentsPage));
    expect(container.firstChild).toHaveClass("w-full");
    expect(container.firstChild).toHaveClass("min-h-screen");
  });
});

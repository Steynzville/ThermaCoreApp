import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as usersAPI from "../services/usersAPI";
import AdminPanel from "./AdminPanel";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", role: "admin" },
    userRole: "admin",
    permissions: { canManageUsers: true },
  }),
}));

vi.mock("../services/usersAPI", () => ({
  getAllUsers: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const mockUsers = {
  data: [
    {
      id: "1",
      username: "john.doe",
      email: "john@example.com",
      first_name: "John",
      last_name: "Doe",
      company: "Test Corp",
      phone_number: "555-1234",
      department: "IT",
      position: "Developer",
      role: { name: "admin" },
      is_active: true,
    },
  ],
};

describe("AdminPanel Component", () => {
  const ensureDocumentBody = () => {
    if (!document.body) {
      document.documentElement.appendChild(document.createElement("body"));
    }
  };
  const waitForInDocument = (callback) =>
    waitFor(callback, { container: document.body });

  beforeEach(() => {
    vi.clearAllMocks();
    ensureDocumentBody();
    usersAPI.getAllUsers.mockResolvedValue(mockUsers);
  });

  describe("Rendering", () => {
    it("should render admin panel", async () => {
      render(
        <BrowserRouter>
          <AdminPanel />
        </BrowserRouter>,
      );

      await waitForInDocument(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });
    });

    it("should render system stats", async () => {
      render(
        <BrowserRouter>
          <AdminPanel />
        </BrowserRouter>,
      );

      await waitForInDocument(() => {
        expect(screen.getByText("Total Devices")).toBeInTheDocument();
        expect(screen.getByText("Active Users")).toBeInTheDocument();
      });
    });

    it("should have custom className", async () => {
      const { container } = render(
        <BrowserRouter>
          <AdminPanel className="custom-class" />
        </BrowserRouter>,
      );

      await waitForInDocument(() => {
        expect(container.firstChild).toHaveClass("custom-class");
      });
    });
  });

  describe("User Loading", () => {
    it("should load users on mount", async () => {
      render(
        <BrowserRouter>
          <AdminPanel />
        </BrowserRouter>,
      );

      await waitForInDocument(() => {
        expect(usersAPI.getAllUsers).toHaveBeenCalledWith({ per_page: 100 });
      });
    });

    it("should display loading state", () => {
      usersAPI.getAllUsers.mockImplementation(() => new Promise(() => {}));

      render(
        <BrowserRouter>
          <AdminPanel />
        </BrowserRouter>,
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should handle fetch errors", async () => {
      usersAPI.getAllUsers.mockRejectedValue(new Error("Failed to fetch"));

      render(
        <BrowserRouter>
          <AdminPanel />
        </BrowserRouter>,
      );

      await waitForInDocument(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load users");
      });
    });
  });

  describe("Dark Mode", () => {
    it("should have dark mode classes", async () => {
      const { container } = render(
        <BrowserRouter>
          <AdminPanel />
        </BrowserRouter>,
      );

      await waitForInDocument(() => {
        const elements = container.querySelectorAll("[class*='dark:']");
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });
});

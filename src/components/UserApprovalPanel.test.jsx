import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPendingUsers, getRoles } from "../services/userService";
import UserApprovalPanel from "./UserApprovalPanel";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../services/userService", () => ({
  getPendingUsers: vi.fn(),
  getRoles: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
}));

vi.mock("../utils/userUtils", () => ({
  formatRoleName: (role) => role?.name || "Unknown",
  formatUserName: (user) => user?.username || "Unknown",
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Check: () => <div>Check</div>,
  X: () => <div>X</div>,
  RefreshCw: () => <div>RefreshCw</div>,
  UserCheck: () => <div>UserCheck</div>,
  UserX: () => <div>UserX</div>,
}));

// Mock UI components
vi.mock("./ui/button", () => ({
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./ui/card", () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

vi.mock("./ui/dialog", () => ({
  Dialog: ({ open, children }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

vi.mock("./ui/label", () => ({
  Label: ({ children, ...props }) => <label htmlFor="test" {...props}>{children}</label>,
}));

vi.mock("./ui/select", () => ({
  Select: ({ children, onValueChange: _onValueChange, value }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: ({ placeholder }) => <div>{placeholder}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value, onSelect }) => (
    <button type="button" onClick={() => onSelect?.(value)}>
      {children}
    </button>
  ),
}));

describe("UserApprovalPanel", () => {
  const mockPendingUsers = [
    {
      id: 1,
      username: "johndoe",
      email: "john@example.com",
      first_name: "John",
      last_name: "Doe",
    },
    {
      id: 2,
      username: "janedoe",
      email: "jane@example.com",
      first_name: "Jane",
      last_name: "Doe",
    },
  ];

  const mockRoles = [
    { id: 1, name: "Admin" },
    { id: 2, name: "User" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getPendingUsers.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });
    getRoles.mockResolvedValue({
      success: true,
      data: mockRoles,
    });
  });

  it("should render the user approval panel", async () => {
    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(/Pending User Registrations/),
      ).toBeInTheDocument();
    });
  });

  it("should fetch and display pending users on mount", async () => {
    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(getPendingUsers).toHaveBeenCalled();
    });
  });

  it("should display loading state", () => {
    render(<UserApprovalPanel />);

    // Component should render even while loading
    expect(screen.getByText(/Pending User Registrations/)).toBeInTheDocument();
  });

  it("should handle fetch pending users error", async () => {
    getPendingUsers.mockRejectedValueOnce(new Error("Network error"));

    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch pending users");
    });
  });

  it("should handle fetch pending users failure response", async () => {
    getPendingUsers.mockResolvedValueOnce({
      success: false,
      message: "Not authorized",
    });

    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Not authorized");
    });
  });

  it("should fetch roles on mount", async () => {
    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(getRoles).toHaveBeenCalled();
    });
  });

  it("should handle no pending users", async () => {
    getPendingUsers.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(/No pending user registrations/i),
      ).toBeInTheDocument();
    });
  });

  it("should display user cards when pending users exist", async () => {
    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(screen.getByText("johndoe")).toBeInTheDocument();
      expect(screen.getByText("@janedoe")).toBeInTheDocument();
    });
  });

  it("should refresh pending users when refresh button is clicked", async () => {
    render(<UserApprovalPanel />);

    await waitFor(() => {
      expect(getPendingUsers).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(getPendingUsers).toHaveBeenCalledTimes(2);
    });
  });
});

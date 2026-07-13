import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveUser, getPendingUsers, getRoles, rejectUser } from "../services/userService";
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
  formatUserName: (user) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.username || "Unknown";
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Check: () => <span data-testid="check-icon">Check</span>,
  X: () => <span data-testid="x-icon">X</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  UserCheck: () => <span data-testid="user-check-icon">UserCheck</span>,
  UserX: () => <span data-testid="user-x-icon">UserX</span>,
}));

// Mock UI components
vi.mock("./ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./ui/card", () => ({
  Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }) => <div data-testid="card-title" {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div data-testid="card-content" {...props}>{children}</div>,
}));

vi.mock("./ui/dialog", () => ({
  Dialog: ({ open, children }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock("./ui/label", () => ({
  Label: ({ children, ...props }) => (
    <label data-testid="label" {...props}>
      {children}
    </label>
  ),
}));

vi.mock("./ui/select", () => ({
  Select: ({ children, onValueChange, value }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, onSelect }) => (
    <button
      data-testid={`select-item-${value}`}
      type="button"
      onClick={() => onSelect?.(value)}
    >
      {children}
    </button>
  ),
}));

// Import mocked modules
import { approveUser as mockApproveUser, rejectUser as mockRejectUser } from "../services/userService";

describe("UserApprovalPanel", () => {
  const ensureDocumentBody = () => {
    if (!document.body) {
      document.documentElement.appendChild(document.createElement("body"));
    }
  };
  const waitForInDocument = (callback) =>
    waitFor(callback, { container: document.body });

  const mockPendingUsers = [
    {
      id: 1,
      username: "johndoe",
      email: "john@example.com",
      first_name: "John",
      last_name: "Doe",
      company: "Acme Inc",
      phone_number: "555-1234",
      department: "Engineering",
      position: "Lead",
      role: { id: 1, name: "User" },
    },
    {
      id: 2,
      username: "janedoe",
      email: "jane@example.com",
      first_name: "Jane",
      last_name: "Doe",
      role: null,
    },
  ];

  const mockRoles = [
    { id: 1, name: "Admin" },
    { id: 2, name: "User" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    ensureDocumentBody();
    getPendingUsers.mockResolvedValue({
      success: true,
      data: mockPendingUsers,
    });
    getRoles.mockResolvedValue({
      success: true,
      data: mockRoles,
    });
    mockApproveUser.mockResolvedValue({
      success: true,
      message: "User approved successfully",
    });
    mockRejectUser.mockResolvedValue({
      success: true,
      message: "User registration rejected",
    });
  });

  it("should render the user approval panel", async () => {
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(
        screen.getByText(/Pending User Registrations/),
      ).toBeInTheDocument();
    });
  });

  it("should fetch and display pending users on mount", async () => {
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(getPendingUsers).toHaveBeenCalled();
    });
  });

  it("should display user cards when pending users exist", async () => {
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("@janedoe")).toBeInTheDocument();
    });
  });

  it("should display user details in the card", async () => {
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("Acme Inc")).toBeInTheDocument();
      expect(screen.getByText("555-1234")).toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
      expect(screen.getByText("Lead")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
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

    await waitForInDocument(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch pending users");
    });
  });

  it("should handle fetch pending users failure response", async () => {
    getPendingUsers.mockResolvedValueOnce({
      success: false,
      message: "Not authorized",
    });

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(toast.error).toHaveBeenCalledWith("Not authorized");
    });
  });

  it("should fetch roles on mount", async () => {
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(getRoles).toHaveBeenCalled();
    });
  });

  it("should handle roles fetch error gracefully", async () => {
    getRoles.mockRejectedValueOnce(new Error("Network error"));

    render(<UserApprovalPanel />);

    // Should not crash - just silently handle the error
    await waitForInDocument(() => {
      expect(screen.getByText(/Pending User Registrations/)).toBeInTheDocument();
    });
  });

  it("should handle no pending users", async () => {
    getPendingUsers.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(
        screen.getByText(/No pending user registrations/i),
      ).toBeInTheDocument();
    });
  });

  it("should refresh pending users when refresh button is clicked", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(getPendingUsers).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    await waitForInDocument(() => {
      expect(getPendingUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("should open approve dialog when Approve button is clicked", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Approve User Registration/)).toBeInTheDocument();
      expect(screen.getByText(/Assign Role/)).toBeInTheDocument();
    });
  });

  it("should open reject dialog when Reject button is clicked", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Reject User Registration/)).toBeInTheDocument();
      expect(screen.getByText(/Reason \(Optional\)/)).toBeInTheDocument();
    });
  });

  it("should approve a user successfully", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Approve User Registration/)).toBeInTheDocument();
    });

    // Select a role - find the select item
    const selectItem = screen.getByTestId("select-item-1");
    await user.click(selectItem);

    const confirmButton = screen.getByRole("button", { name: /Approve User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(mockApproveUser).toHaveBeenCalledWith(1, 1);
      expect(toast.success).toHaveBeenCalledWith("User approved successfully");
    });
  });

  it("should approve a user with null role ID", async () => {
    const user = userEvent.setup();
    mockApproveUser.mockResolvedValueOnce({
      success: true,
      message: "User approved successfully",
    });

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Approve User Registration/)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Approve User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(mockApproveUser).toHaveBeenCalledWith(1, null);
      expect(toast.success).toHaveBeenCalledWith("User approved successfully");
    });
  });

  it("should handle approve user failure", async () => {
    const user = userEvent.setup();
    mockApproveUser.mockResolvedValueOnce({
      success: false,
      message: "Approval failed",
    });

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Approve User Registration/)).toBeInTheDocument();
    });

    const selectItem = screen.getByTestId("select-item-1");
    await user.click(selectItem);

    const confirmButton = screen.getByRole("button", { name: /Approve User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(toast.error).toHaveBeenCalledWith("Approval failed");
    });
  });

  it("should handle approve user exception", async () => {
    const user = userEvent.setup();
    mockApproveUser.mockRejectedValueOnce(new Error("Network error"));

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Approve User Registration/)).toBeInTheDocument();
    });

    const selectItem = screen.getByTestId("select-item-1");
    await user.click(selectItem);

    const confirmButton = screen.getByRole("button", { name: /Approve User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to approve user");
    });
  });

  it("should reject a user successfully", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Reject User Registration/)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Reject User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(mockRejectUser).toHaveBeenCalledWith(1, "");
      expect(toast.success).toHaveBeenCalledWith("User registration rejected");
    });
  });

  it("should reject a user with rejection reason", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Reject User Registration/)).toBeInTheDocument();
    });

    const reasonTextarea = screen.getByPlaceholderText(/Enter reason for rejection/i);
    await user.type(reasonTextarea, "Duplicate account");

    const confirmButton = screen.getByRole("button", { name: /Reject User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(mockRejectUser).toHaveBeenCalledWith(1, "Duplicate account");
      expect(toast.success).toHaveBeenCalledWith("User registration rejected");
    });
  });

  it("should handle reject user failure", async () => {
    const user = userEvent.setup();
    mockRejectUser.mockResolvedValueOnce({
      success: false,
      message: "Rejection failed",
    });

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Reject User Registration/)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Reject User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(toast.error).toHaveBeenCalledWith("Rejection failed");
    });
  });

  it("should handle reject user exception", async () => {
    const user = userEvent.setup();
    mockRejectUser.mockRejectedValueOnce(new Error("Network error"));

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Reject User Registration/)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Reject User/i });
    await user.click(confirmButton);

    await waitForInDocument(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to reject user");
    });
  });

  it("should close dialogs on cancel", async () => {
    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Open approve dialog
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Approve User Registration/)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelButton);

    await waitForInDocument(() => {
      expect(screen.queryByText(/Approve User Registration/)).not.toBeInTheDocument();
    });

    // Open reject dialog
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/Reject User Registration/)).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
    await user.click(cancelButtons[1]);

    await waitForInDocument(() => {
      expect(screen.queryByText(/Reject User Registration/)).not.toBeInTheDocument();
    });
  });

  it("should handle error state and show try again button", async () => {
    getPendingUsers.mockRejectedValueOnce(new Error("Network error"));

    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      expect(screen.getByText(/Try Again/)).toBeInTheDocument();
    });

    getPendingUsers.mockResolvedValueOnce({
      success: true,
      data: mockPendingUsers,
    });

    const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
    await userEvent.click(tryAgainButton);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("should show warning when no roles are available", async () => {
    getRoles.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    const user = userEvent.setup();
    render(<UserApprovalPanel />);

    await waitForInDocument(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitForInDocument(() => {
      expect(screen.getByText(/No roles available/)).toBeInTheDocument();
      expect(screen.getByText(/Contact an administrator to set up roles/)).toBeInTheDocument();
    });

    // Approve button should be disabled
    const confirmButton = screen.getByRole("button", { name: /Approve User/i });
    expect(confirmButton).toBeDisabled();
  });
});

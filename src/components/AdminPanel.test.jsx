/**
 * Tests for AdminPanel Component
 *
 * Goal: exercise every function, branch, and conditional render path in
 * src/components/AdminPanel.jsx.
 *
 * Coverage areas:
 * - Tab rendering & switching (Users, User Approvals, Password Management, Settings)
 * - User list: loading / error / empty / populated states, retry
 * - Create User modal: validation, role loading (all response shapes), success/failure/exception
 * - Edit User modal: open, edit fields, save, cancel
 * - Delete User: confirm true/false, success, error
 * - Password reset (self + per-user): validation, all error-message branches, success, cancel
 * - Settings tab: toggle each setting both directions
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import AdminPanel from "../components/AdminPanel";
import { useAuth } from "../context/AuthContext";
import { deleteUser, getAllUsers } from "../services/usersAPI";
import { apiGet, apiPost } from "../utils/apiFetch";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/usersAPI", () => ({
  getAllUsers: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("../utils/userUtils", () => ({
  formatUserName: (user) => {
    const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return full || user.username || "Unknown";
  },
  formatRoleName: (role) => (role && role.name ? role.name : "N/A"),
}));

vi.mock("../components/PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("../components/UserApprovalPanel", () => ({
  default: () => <div data-testid="user-approval-panel">User Approvals Panel</div>,
}));

vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, className }) => (
    <button data-testid="button" className={className} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  Database: () => <span data-testid="icon-database" />,
  Edit: () => <span data-testid="icon-edit" />,
  Eye: (props) => (
    <button data-testid="eye-icon" aria-label="Show password" type="button" {...props}>
      Eye
    </button>
  ),
  EyeOff: (props) => (
    <button data-testid="eye-off-icon" aria-label="Hide password" type="button" {...props}>
      EyeOff
    </button>
  ),
  Key: () => <span data-testid="icon-key" />,
  Lock: () => <span data-testid="icon-lock" />,
  Plus: () => <span data-testid="icon-plus" />,
  Settings: () => <span data-testid="icon-settings" />,
  Shield: () => <span data-testid="icon-shield" />,
  Trash2: () => <span data-testid="icon-trash" />,
  UserCheck: () => <span data-testid="icon-user-check" />,
  Users: () => <span data-testid="icon-users" />,
}));

// ---------------------------------------------------------------------------
// Fixtures & helpers
// ---------------------------------------------------------------------------

const mockCurrentUser = {
  id: 1,
  username: "admin",
  email: "admin@thermacore.com",
  firstName: "Admin",
  lastName: "User",
};

const twoUsersResponse = {
  data: [
    {
      id: 1,
      username: "john_doe",
      email: "john@thermacore.com",
      first_name: "John",
      last_name: "Doe",
      company: "Thermacore",
      phone_number: "555-1111",
      department: "Engineering",
      position: "Lead",
      role: { name: "admin" },
      is_active: true,
    },
    {
      id: 2,
      username: "jane_smith",
      email: "jane@thermacore.com",
      first_name: "Jane",
      last_name: "Smith",
      role: { name: "operator" },
      is_active: false,
      // no company / phone_number / department / position -> N/A branches
    },
  ],
};

const rolesArrayFormat = [
  { id: 1, name: "admin" },
  { id: 2, name: "operator" },
  { id: 3, name: "viewer" },
];

function jsonResponse(ok, body) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  });
}

function renderPanel() {
  return render(
    <BrowserRouter>
      <AdminPanel />
    </BrowserRouter>
  );
}

async function goToUsersTab(user) {
  const tabs = screen.getAllByText("Users");
  await user.click(tabs[0]);
}

async function goToPasswordTab(user) {
  const tabs = screen.getAllByText("Password Management");
  await user.click(tabs[0]);
}

async function goToSettingsTab(user) {
  const tabs = screen.getAllByText("Settings");
  await user.click(tabs[tabs.length - 1]); // last "Settings" text is the tab, first is icon-adjacent stat label
}

async function openCreateUserModal(user) {
  const addUserBtn = await screen.findByText("Add User");
  await user.click(addUserBtn);
}

async function fillCreateUserRequiredFields(user, { username = "newuser", email = "new@x.com", password = "password1" } = {}) {
  await user.type(screen.getByLabelText(/Username/i), username);
  await user.type(screen.getByLabelText(/^Email/i), email);
  await user.type(screen.getByLabelText(/^Password/i), password);
}

// The submit button's label text lives in a nested <span>, and the words
// "Reset Password" also appear as the modal heading and on background table
// rows, so scope to the open modal and query by role to get a single,
// unambiguous element whose `disabled` state actually reflects the button.
function resetSubmitButton() {
  return within(screen.getByTestId("password-reset-modal")).getByRole("button", {
    name: /Reset Password|Resetting/i,
  });
}

// Same idea for "Create User": its label is a nested <span>, so getByText
// returns the span (which is never itself disabled). Resolve to the button.
function createUserSubmitButton() {
  return screen.getByText("Create User").closest("button");
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);

  useAuth.mockReturnValue({ user: mockCurrentUser });
  getAllUsers.mockResolvedValue(twoUsersResponse);
  deleteUser.mockResolvedValue({ ok: true, status: 204 });
  apiGet.mockResolvedValue(jsonResponse(true, { roles: rolesArrayFormat }));
  apiPost.mockResolvedValue(jsonResponse(true, { success: true }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tab rendering & switching
// ---------------------------------------------------------------------------

describe("Tab rendering", () => {
  it("renders all four tabs and defaults to Users tab content", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("User Approvals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Password Management").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);

    expect(await screen.findByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Add User")).toBeInTheDocument();
  });

  it("renders system stats cards", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText("Total Devices")).toBeInTheDocument();
      expect(screen.getByText("Active Users")).toBeInTheDocument();
      expect(screen.getByText("System Uptime")).toBeInTheDocument();
      expect(screen.getByText("Data Points")).toBeInTheDocument();
    });
  });

  it("switches to User Approvals tab and renders UserApprovalPanel", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));

    await user.click(screen.getByText("User Approvals"));
    expect(await screen.findByTestId("user-approval-panel")).toBeInTheDocument();
  });

  it("switches to Password Management tab", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));

    await goToPasswordTab(user);
    expect(await screen.findByText("Change My Password")).toBeInTheDocument();
    expect(screen.getByText("User Password Reset")).toBeInTheDocument();
  });

  it("switches to Settings tab", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));

    await goToSettingsTab(user);
    expect(await screen.findByText("System Settings")).toBeInTheDocument();
    expect(screen.getByText("Email Notifications")).toBeInTheDocument();
    expect(screen.getByText("Auto Backup")).toBeInTheDocument();
    expect(screen.getByText("Maintenance Mode")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Users list: loading / error / empty / populated
// ---------------------------------------------------------------------------

describe("User list states", () => {
  it("shows a loading spinner while fetching users", async () => {
    let resolveFn;
    getAllUsers.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    renderPanel();
    expect(screen.getByText("Loading users...")).toBeInTheDocument();

    resolveFn(twoUsersResponse);
    await waitFor(() => expect(screen.queryByText("Loading users...")).not.toBeInTheDocument());
  });

  it("shows an error state and retries on 'Try Again'", async () => {
    const user = userEvent.setup();
    getAllUsers.mockRejectedValueOnce(new Error("network down"));

    renderPanel();

    expect(await screen.findByText("Failed to load users. Please try again.")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Failed to load users");

    getAllUsers.mockResolvedValueOnce(twoUsersResponse);
    await user.click(screen.getByText("Try Again"));

    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
  });

  it("shows an empty state when there are no users", async () => {
    getAllUsers.mockResolvedValueOnce({ data: [] });
    renderPanel();
    expect(await screen.findByText("No users found")).toBeInTheDocument();
  });

  it("renders populated user rows with N/A fallbacks for missing fields", async () => {
    renderPanel();

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // Jane has no company/phone/department/position -> N/A fallback branch
    const janeRow = screen.getByText("Jane Smith").closest("tr");
    expect(within(janeRow).getAllByText("N/A").length).toBeGreaterThan(0);

    // Status branches: Active vs Inactive
    const johnRow = screen.getByText("John Doe").closest("tr");
    expect(within(johnRow).getByText("Active")).toBeInTheDocument();
    expect(within(janeRow).getByText("Inactive")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Create User modal
// ---------------------------------------------------------------------------

describe("Create User modal", () => {
  it("opens the modal and fetches roles (array-wrapped format)", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(true, { roles: rolesArrayFormat }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    expect(screen.getByText("Create New User")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Operator" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Viewer" })).toBeInTheDocument();
    });
  });

  it("fetches roles when response is a bare array", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(true, rolesArrayFormat));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
    });
  });

  it("shows a roles error banner when the roles payload shape is invalid", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(true, { unexpected: "shape" }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    expect(await screen.findByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
  });

  it("shows a roles error banner when the roles array is empty", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(true, { roles: [] }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    expect(await screen.findByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
  });

  it("shows a roles error banner when the roles fetch response is not ok", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(false, {}));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    expect(await screen.findByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
  });

  it("shows a roles error banner when the roles fetch throws", async () => {
    const user = userEvent.setup();
    apiGet.mockRejectedValueOnce(new Error("boom"));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    expect(await screen.findByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
  });

  it("re-fetches roles on reopening the modal after a prior roles error", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(false, {}));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    expect(await screen.findByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));

    apiGet.mockResolvedValueOnce(jsonResponse(true, { roles: rolesArrayFormat }));
    await openCreateUserModal(user);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
    });
  });

  it("validates required fields in order: username, email, password, role", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await user.click(screen.getByText("Create User"));
    expect(toast.error).toHaveBeenCalledWith("Username is required");

    await user.type(screen.getByLabelText(/Username/i), "newuser");
    await user.click(screen.getByText("Create User"));
    expect(toast.error).toHaveBeenCalledWith("Email is required");

    await user.type(screen.getByLabelText(/^Email/i), "new@x.com");
    await user.click(screen.getByText("Create User"));
    expect(toast.error).toHaveBeenCalledWith("Password is required");

    await user.type(screen.getByLabelText(/^Password/i), "password1");
    await user.click(screen.getByText("Create User"));
    expect(toast.error).toHaveBeenCalledWith("Role is required");
  });

  it("validates minimum password length before submitting", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user, { password: "123" });
    await user.selectOptions(screen.getByLabelText(/Role/i), "1");
    await user.click(screen.getByText("Create User"));

    expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters long");
  });

  it("toggles the create-password visibility", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    const passwordInput = screen.getByLabelText(/^Password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByTestId("eye-icon"));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByTestId("eye-off-icon"));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("creates a user successfully, closes the modal, and refreshes the list", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(true, { success: true }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user);
    await user.selectOptions(screen.getByLabelText(/Role/i), "1");
    await user.click(screen.getByText("Create User"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User newuser created successfully");
    });
    expect(screen.queryByText("Create New User")).not.toBeInTheDocument();
    expect(getAllUsers).toHaveBeenCalledTimes(2); // initial mount + post-create refresh
  });

  it("shows a server error message on failed creation (result.error)", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(false, { error: "Username taken" }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user);
    await user.selectOptions(screen.getByLabelText(/Role/i), "1");
    await user.click(screen.getByText("Create User"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Username taken"));
  });

  it("falls back to result.message when result.error is absent", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(false, { message: "Server exploded" }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user);
    await user.selectOptions(screen.getByLabelText(/Role/i), "1");
    await user.click(screen.getByText("Create User"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server exploded"));
  });

  it("falls back to the generic message when the server returns nothing useful", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(false, {}));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user);
    await user.selectOptions(screen.getByLabelText(/Role/i), "1");
    await user.click(screen.getByText("Create User"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to create user"));
  });

  it("shows the exception message when apiPost throws", async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValueOnce(new Error("connection refused"));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user);
    await user.selectOptions(screen.getByLabelText(/Role/i), "1");
    await user.click(screen.getByText("Create User"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("connection refused"));
  });

  it("blocks submission when roles failed to load even if fields are filled", async () => {
    const user = userEvent.setup();
    apiGet.mockResolvedValueOnce(jsonResponse(false, {}));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    expect(await screen.findByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();

    // Create button should be disabled in this state
    expect(createUserSubmitButton()).toBeDisabled();
  });

  it("fills optional fields (first/last name, phone, company, department, position)", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(true, { success: true }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);
    await waitFor(() => screen.getByRole("option", { name: "Admin" }));

    await fillCreateUserRequiredFields(user);
    await user.type(screen.getByLabelText(/First Name/i), "New");
    await user.type(screen.getByLabelText(/Last Name/i), "User");
    await user.type(screen.getByLabelText(/Phone Number/i), "555-0000");
    await user.type(screen.getByLabelText(/Company/i), "Acme");
    await user.type(screen.getByLabelText(/Department/i), "Ops");
    await user.type(screen.getByLabelText(/Position/i), "Tech");
    await user.selectOptions(screen.getByLabelText(/Role/i), "2");
    await user.click(screen.getByText("Create User"));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(apiPost).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/register"),
      expect.objectContaining({
        first_name: "New",
        last_name: "User",
        phone_number: "555-0000",
        company: "Acme",
        department: "Ops",
        position: "Tech",
        role_id: 2,
      }),
      expect.any(Object)
    );
  });

  it("closes the create modal via Cancel without submitting", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await openCreateUserModal(user);

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Create New User")).not.toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Edit User modal
// ---------------------------------------------------------------------------

describe("Edit User modal", () => {
  it("opens with the selected user's data prefilled", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");

    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByTestId("icon-edit").closest("button"));

    expect(screen.getByText("Edit User")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("John Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("john@thermacore.com");
  });

  it("edits fields and saves, updating the row in place", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");

    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByTestId("icon-edit").closest("button"));

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Johnathan Doe");

    await user.selectOptions(screen.getByLabelText("Status"), "Inactive");
    await user.click(screen.getByText("Save"));

    expect(screen.queryByText("Edit User")).not.toBeInTheDocument();
    expect(await screen.findByText("Johnathan Doe")).toBeInTheDocument();
  });

  it("cancels editing without saving changes", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");

    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByTestId("icon-edit").closest("button"));

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Should Not Save");
    await user.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Edit User")).not.toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Should Not Save")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete User
// ---------------------------------------------------------------------------

describe("Delete User", () => {
  it("does nothing when the confirm dialog is dismissed", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false);

    renderPanel();
    await screen.findByText("John Doe");
    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByTestId("icon-trash").closest("button"));

    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes a user successfully and refreshes the list", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByTestId("icon-trash").closest("button"));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("User deleted successfully"));
  });

  it("shows an error toast when deletion fails", async () => {
    const user = userEvent.setup();
    deleteUser.mockRejectedValueOnce(new Error("cannot delete"));

    renderPanel();
    await screen.findByText("John Doe");
    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByTestId("icon-trash").closest("button"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to delete user"));
  });
});

// ---------------------------------------------------------------------------
// Password reset (self)
// ---------------------------------------------------------------------------

describe("Self password reset", () => {
  it("uses firstName/lastName when available", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToPasswordTab(user);

    await user.click(screen.getByText("Change My Password"));
    expect(await screen.findByTestId("password-reset-modal")).toBeInTheDocument();
    expect(screen.getByText(/Resetting password for:/)).toHaveTextContent("Admin User");
  });

  it("falls back to username when first/last name are absent", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { id: 2, username: "plainuser", email: "p@x.com" } });

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToPasswordTab(user);

    await user.click(screen.getByText("Change My Password"));
    expect(screen.getByText(/Resetting password for:/)).toHaveTextContent("plainuser");
  });

  it("falls back to id 1 when currentUser has no id", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { username: "noid" } });
    apiPost.mockResolvedValueOnce(jsonResponse(true, { success: true }));

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToPasswordTab(user);
    await user.click(screen.getByText("Change My Password"));

    await user.type(screen.getByPlaceholderText("Enter new password"), "goodpass1");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "goodpass1");
    await user.click(resetSubmitButton());

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        expect.stringContaining("/users/1/reset-password"),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it("does nothing if currentUser is falsy", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: null });

    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToPasswordTab(user);
    await user.click(screen.getByText("Change My Password"));

    expect(screen.queryByTestId("password-reset-modal")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Password reset (per-user) + validation + visibility toggles
// ---------------------------------------------------------------------------

describe("Password reset modal — validation & visibility", () => {
  async function openResetForJohn(user) {
    await goToPasswordTab(user);
    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByText("Reset Password"));
    await screen.findByTestId("password-reset-modal");
  }

  it("opens per-user reset modal from the Password Management table", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    await openResetForJohn(user);
    expect(screen.getByText(/Resetting password for:/)).toHaveTextContent("John Doe");
  });

  it("shows a length error while the password is under 6 characters", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    await openResetForJohn(user);

    await user.type(screen.getByPlaceholderText("Enter new password"), "123");
    expect(await screen.findByText("Password must be at least 6 characters long")).toBeInTheDocument();
    expect(resetSubmitButton()).toBeDisabled();
  });

  it("shows a mismatch error once length is valid but confirm differs", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    await openResetForJohn(user);

    await user.type(screen.getByPlaceholderText("Enter new password"), "password1");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "password2");

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(resetSubmitButton()).toBeDisabled();
  });

  it("enables submit once both fields are valid and matching", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    await openResetForJohn(user);

    await user.type(screen.getByPlaceholderText("Enter new password"), "password1");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "password1");

    expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
    expect(screen.queryByText("Password must be at least 6 characters long")).not.toBeInTheDocument();
    expect(resetSubmitButton()).toBeEnabled();
  });

  it("toggles visibility independently for new and confirm password fields", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    await openResetForJohn(user);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");
    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const eyeIcons = screen.getAllByTestId("eye-icon");
    await user.click(eyeIcons[0]);
    expect(newPasswordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const eyeOffIcons = screen.getAllByTestId("eye-off-icon");
    await user.click(eyeOffIcons[0]);
    expect(newPasswordInput).toHaveAttribute("type", "password");
  });

  it("closes the modal via Cancel and resets its internal state", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("John Doe");
    await openResetForJohn(user);

    await user.type(screen.getByPlaceholderText("Enter new password"), "password1");
    await user.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("password-reset-modal")).not.toBeInTheDocument();

    // reopen and confirm fields are cleared
    await openResetForJohn(user);
    expect(screen.getByPlaceholderText("Enter new password")).toHaveValue("");
  });
});

describe("Password reset modal — submission outcomes", () => {
  async function openResetAndFill(user) {
    await goToPasswordTab(user);
    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(within(johnRow).getByText("Reset Password"));
    await screen.findByTestId("password-reset-modal");
    await user.type(screen.getByPlaceholderText("Enter new password"), "password1");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "password1");
  }

  it("succeeds and closes the modal", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(true, { success: true }));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully for John Doe");
    });
    expect(screen.queryByTestId("password-reset-modal")).not.toBeInTheDocument();
  });

  it("shows the server error message on a non-ok response (result.error)", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(false, { error: "Weak password" }));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent("Weak password");
  });

  it("falls back to result.message, then the generic message", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(false, { message: "Server said no" }));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent("Server said no");
  });

  it("falls back to the generic failure message when nothing else is provided", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce(jsonResponse(false, {}));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent("Failed to reset password");
  });

  it("shows a connection-specific message for 'Failed to fetch' errors", async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValueOnce(new Error("Failed to fetch"));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent(/Unable to connect to backend server/);
  });

  it("shows a network-specific message for 'network' errors", async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValueOnce(new Error("network error occurred"));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent(/Network error occurred/);
  });

  it("shows a timeout-specific message for 'timeout' errors", async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValueOnce(new Error("request timeout"));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent(/request timed out/);
  });

  it("shows a CORS-specific message for 'CORS' errors", async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValueOnce(new Error("CORS policy blocked"));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent(/Cross-origin request blocked/);
  });

  it("shows the raw error message for unrecognized exceptions", async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValueOnce(new Error("something odd happened"));

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByTestId("password-error")).toHaveTextContent("something odd happened");
  });

  it("shows a spinner and disables buttons while submitting", async () => {
    const user = userEvent.setup();
    let resolveFn;
    apiPost.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    renderPanel();
    await screen.findByText("John Doe");
    await openResetAndFill(user);
    await user.click(resetSubmitButton());

    expect(await screen.findByText("Resetting...")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeDisabled();

    resolveFn(jsonResponse(true, { success: true }));
    await waitFor(() => expect(screen.queryByTestId("password-reset-modal")).not.toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

describe("Settings tab", () => {
  it("toggles Email Notifications between Disable and Enable", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToSettingsTab(user);

    const row = screen.getByText("Email Notifications").closest("div").parentElement;
    const toggle = within(row).getByTestId("button");
    expect(toggle).toHaveTextContent("Disable"); // starts true -> Disable shown

    await user.click(toggle);
    expect(toggle).toHaveTextContent("Enable");

    await user.click(toggle);
    expect(toggle).toHaveTextContent("Disable");
  });

  it("toggles Auto Backup between Disable and Enable", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToSettingsTab(user);

    const row = screen.getByText("Auto Backup").closest("div").parentElement;
    const toggle = within(row).getByTestId("button");
    expect(toggle).toHaveTextContent("Disable");

    await user.click(toggle);
    expect(toggle).toHaveTextContent("Enable");
  });

  it("toggles Maintenance Mode between Enable and Disable", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => screen.getByText("User Management"));
    await goToSettingsTab(user);

    const row = screen.getByText("Maintenance Mode").closest("div").parentElement;
    const toggle = within(row).getByTestId("button");
    expect(toggle).toHaveTextContent("Enable"); // starts false -> Enable shown

    await user.click(toggle);
    expect(toggle).toHaveTextContent("Disable");
  });
});

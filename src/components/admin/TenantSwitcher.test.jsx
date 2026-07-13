import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import TenantSwitcher from "./TenantSwitcher";

// Mock lucide-react icons to render as simple text elements so JSDOM-based
// text/testid assertions can find them (real SVGs don't expose readable text)
vi.mock("lucide-react", () => ({
  Building2: () => <span data-testid="building-icon">Building2</span>,
  ChevronDown: () => <span data-testid="chevron-icon">ChevronDown</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

// Mock the TenantContext
const mockSwitchTenant = vi.fn();
let mockTenantState = {
  currentTenant: null,
  availableTenants: [
    { id: "tenant-1", name: "Tenant One" },
    { id: "tenant-2", name: "Tenant Two" },
  ],
  isAdmin: true,
  switchTenant: mockSwitchTenant,
  isLoading: false,
};

vi.mock("../../context/TenantContext", () => ({
  useTenant: () => mockTenantState,
}));

// Mock the dropdown menu components
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }) => (
    <div data-testid="dropdown-item" onClick={onClick} disabled={disabled}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}));

// Mock the Button component - simplified to avoid icon text issues
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className }) => (
    <button data-testid="button" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe("TenantSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockTenantState = {
      currentTenant: null,
      availableTenants: [
        { id: "tenant-1", name: "Tenant One" },
        { id: "tenant-2", name: "Tenant Two" },
      ],
      isAdmin: true,
      switchTenant: mockSwitchTenant,
      isLoading: false,
    };
  });

  it("should return null if user is not an admin", () => {
    mockTenantState.isAdmin = false;

    const { container } = render(<TenantSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null if isLoading is true", () => {
    mockTenantState.isLoading = true;

    const { container } = render(<TenantSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("should render the dropdown with 'All Tenants' when no current tenant is selected", () => {
    render(<TenantSwitcher />);

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();

    const button = screen.getByTestId("button");
    expect(button).toHaveTextContent("All Tenants");
  });

  it("should display the active tenant name when a tenant is selected", () => {
    mockTenantState.currentTenant = { id: "tenant-1", name: "Tenant One" };

    render(<TenantSwitcher />);

    const button = screen.getByTestId("button");
    expect(button).toHaveTextContent("Tenant One");
  });

  it("should render dropdown content with 'Switch Tenant' label", () => {
    render(<TenantSwitcher />);

    expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
    expect(screen.getByTestId("dropdown-label")).toHaveTextContent("Switch Tenant");
    expect(screen.getAllByTestId("dropdown-separator")).toHaveLength(2);
  });

  it("should display all available tenants as options", () => {
    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    // All Tenants + 2 tenants = 3 items
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("All Tenants");
    expect(items[1]).toHaveTextContent("Tenant One");
    expect(items[2]).toHaveTextContent("Tenant Two");
  });

  it("should show checkmark next to 'All Tenants' when no tenant is selected", () => {
    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    // Check the "All Tenants" item (first one) - it should contain the Check icon
    expect(items[0]).toHaveTextContent("All Tenants");
    expect(items[0].textContent).toContain("Check");
  });

  it("should show checkmark next to the currently selected tenant", () => {
    mockTenantState.currentTenant = { id: "tenant-1", name: "Tenant One" };

    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    // "All Tenants" should NOT have checkmark
    expect(items[0].textContent).not.toContain("Check");
    // "Tenant One" should have checkmark
    expect(items[1].textContent).toContain("Tenant One");
    expect(items[1].textContent).toContain("Check");
    // "Tenant Two" should NOT have checkmark
    expect(items[2].textContent).not.toContain("Check");
  });

  it("should display message when no available tenants are listed", () => {
    mockTenantState.availableTenants = [];

    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    // Should have 2 items: All Tenants + No tenants available
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent("No tenants available");
  });

  it("should call switchTenant with null when 'All Tenants' is clicked", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    // Click "All Tenants" (first item)
    await user.click(items[0]);

    expect(mockSwitchTenant).toHaveBeenCalledWith(null);
  });

  it("should call switchTenant with tenant id when a tenant is clicked", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    // Click "Tenant Two" (third item)
    await user.click(items[2]);

    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-2");
  });

  it("should handle multiple tenant switches in sequence", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");

    // Click "Tenant One"
    await user.click(items[1]);
    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-1");

    // Click "Tenant Two"
    await user.click(items[2]);
    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-2");

    // Click "All Tenants"
    await user.click(items[0]);
    expect(mockSwitchTenant).toHaveBeenCalledWith(null);
  });

  it("should handle switch with fireEvent", () => {
    render(<TenantSwitcher />);

    const items = screen.getAllByTestId("dropdown-item");
    fireEvent.click(items[1]);

    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-1");
  });

  it("should have correct button classes", () => {
    render(<TenantSwitcher />);

    const button = screen.getByTestId("button");
    expect(button).toHaveClass("flex", "items-center", "gap-2", "min-w-[200px]");
  });

  it("should render the building icon in the button", () => {
    render(<TenantSwitcher />);

    const button = screen.getByTestId("button");
    expect(button.textContent).toContain("Building2");
  });

  it("should render chevron icon in the button", () => {
    render(<TenantSwitcher />);

    const button = screen.getByTestId("button");
    expect(button.textContent).toContain("ChevronDown");
  });
});

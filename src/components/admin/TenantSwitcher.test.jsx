import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import TenantSwitcher from "./TenantSwitcher";

// ============================================================
// ✅ FIX: Reliable in-memory sessionStorage mock
// jsdom's native implementation can silently no-op in some
// environments/origins, causing sessionStorage.getItem to
// return undefined instead of the stored value.
// ============================================================
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// ✅ Added configurable: true to prevent TypeError in some jsdom setups
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// Mock lucide-react icons
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

// ✅ Safe: Async mock factory with dynamic React import
vi.mock("@/components/ui/dropdown-menu", async () => {
  const React = await import("react");
  
  // DropdownMenuMock is created once inside the factory closure
  // This keeps identity stable across renders, which is necessary for useState to persist
  const DropdownMenuMock = ({ children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    
    // Inject open state into children
    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { isOpen, setIsOpen });
      }
      return child;
    });
    
    return React.createElement('div', { 'data-testid': 'dropdown-menu' }, childrenWithProps);
  };
  
  return {
    DropdownMenu: ({ children }) => React.createElement(DropdownMenuMock, { children }),
    DropdownMenuTrigger: ({ children, isOpen, setIsOpen }) => (
      React.createElement('div', {
        'data-testid': 'dropdown-trigger',
        onClick: () => setIsOpen(!isOpen),
        'data-state': isOpen ? 'open' : 'closed',
      }, children)
    ),
    DropdownMenuContent: ({ children, isOpen }) => (
      React.createElement('div', {
        'data-testid': 'dropdown-content',
        hidden: !isOpen,
        style: { display: isOpen ? 'block' : 'none' },
      }, children)
    ),
    DropdownMenuItem: ({ children, onClick, disabled, className }) => (
      React.createElement('div', {
        'data-testid': 'dropdown-item',
        onClick: disabled ? undefined : onClick,
        disabled: disabled,
        className: className,
        'data-disabled': disabled ? 'true' : 'false',
      }, children)
    ),
    DropdownMenuLabel: ({ children }) => (
      React.createElement('div', { 'data-testid': 'dropdown-label' }, children)
    ),
    DropdownMenuSeparator: () => (
      React.createElement('div', { 'data-testid': 'dropdown-separator' })
    ),
  };
});

// Button mock includes variant prop
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, variant }) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

describe("TenantSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ✅ sessionStorage.clear() now clears the in-memory mock
    sessionStorage.clear();
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

  it("should have dropdown content hidden initially", () => {
    render(<TenantSwitcher />);
    
    const content = screen.getByTestId("dropdown-content");
    expect(content).toHaveAttribute("hidden");
    expect(content).toHaveStyle({ display: "none" });
  });

  it("should open dropdown when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    expect(trigger).toHaveAttribute("data-state", "closed");
    
    await user.click(trigger);
    
    expect(trigger).toHaveAttribute("data-state", "open");
    const content = screen.getByTestId("dropdown-content");
    expect(content).not.toHaveAttribute("hidden");
    expect(content).toHaveStyle({ display: "block" });
  });

  it("should display all available tenants as options", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("All Tenants");
    expect(items[1]).toHaveTextContent("Tenant One");
    expect(items[2]).toHaveTextContent("Tenant Two");
  });

  // ✅ FIX: Use testid for checkmark assertions instead of text content
  it("should show checkmark next to 'All Tenants' when no tenant is selected", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    expect(items[0]).toHaveTextContent("All Tenants");
    // ✅ Use getByTestId instead of text content
    const checkIcon = items[0].querySelector('[data-testid="check-icon"]');
    expect(checkIcon).toBeInTheDocument();
  });

  // ✅ FIX: Use testid for checkmark assertions instead of text content
  it("should show checkmark next to the currently selected tenant", async () => {
    mockTenantState.currentTenant = { id: "tenant-1", name: "Tenant One" };
    
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    
    // All Tenants should NOT have checkmark
    const allTenantsCheck = items[0].querySelector('[data-testid="check-icon"]');
    expect(allTenantsCheck).not.toBeInTheDocument();
    
    // Tenant One should have checkmark
    const tenantOneCheck = items[1].querySelector('[data-testid="check-icon"]');
    expect(tenantOneCheck).toBeInTheDocument();
    
    // Tenant Two should NOT have checkmark
    const tenantTwoCheck = items[2].querySelector('[data-testid="check-icon"]');
    expect(tenantTwoCheck).not.toBeInTheDocument();
  });

  it("should display message when no available tenants are listed", async () => {
    mockTenantState.availableTenants = [];
    
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent("No tenants available");
  });

  it("should not call switchTenant when disabled item is clicked", async () => {
    mockTenantState.availableTenants = [];
    
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    const disabledItem = items[1];
    
    // Verify the item is disabled
    expect(disabledItem).toHaveAttribute("data-disabled", "true");
    // Use fireEvent to bypass pointer-events check
    fireEvent.click(disabledItem);
    expect(mockSwitchTenant).not.toHaveBeenCalled();
  });

  it("should call switchTenant with null when 'All Tenants' is clicked", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    await user.click(items[0]);

    expect(mockSwitchTenant).toHaveBeenCalledWith(null);
    expect(sessionStorage.getItem("tenant_selected")).toBe("true");
  });

  it("should call switchTenant with tenant id when a tenant is clicked", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    await user.click(items[2]);

    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-2");
    expect(sessionStorage.getItem("tenant_selected")).toBe("true");
  });

  it("should handle multiple tenant switches in sequence", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");

    await user.click(items[1]);
    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-1");
    expect(sessionStorage.getItem("tenant_selected")).toBe("true");

    sessionStorage.clear();

    await user.click(items[2]);
    expect(mockSwitchTenant).toHaveBeenCalledWith("tenant-2");
    expect(sessionStorage.getItem("tenant_selected")).toBe("true");

    sessionStorage.clear();

    await user.click(items[0]);
    expect(mockSwitchTenant).toHaveBeenCalledWith(null);
    expect(sessionStorage.getItem("tenant_selected")).toBe("true");
  });

  it("should have correct button classes", () => {
    render(<TenantSwitcher />);

    const button = screen.getByTestId("button");
    expect(button).toHaveClass("flex", "items-center", "gap-2", "min-w-[200px]");
  });

  it("should have variant 'outline' on the button", () => {
    render(<TenantSwitcher />);

    const button = screen.getByTestId("button");
    expect(button).toHaveAttribute("data-variant", "outline");
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

  it("should have truncate class on 'All Tenants' text", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const allTenantsItem = screen.getAllByTestId("dropdown-item")[0];
    const span = allTenantsItem.querySelector(".truncate");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("All Tenants");
  });

  it("should have truncate class on tenant names", async () => {
    const user = userEvent.setup();
    render(<TenantSwitcher />);
    
    const trigger = screen.getByTestId("dropdown-trigger");
    await user.click(trigger);

    const items = screen.getAllByTestId("dropdown-item");
    const tenantItem = items[1];
    const span = tenantItem.querySelector(".truncate");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("Tenant One");
  });
});

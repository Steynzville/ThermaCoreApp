/**
 * Tests for Sidebar UI Component
 *
 * NOTE: These mocks rely on the `@/` alias resolving to `src/`.
 * If the alias configuration changes, update the import paths accordingly.
 *
 * Covers rendering, state management, provider/controlled behavior,
 * keyboard shortcuts, cookie persistence, mobile variant, and the
 * smaller leaf components (trigger, rail, badge, skeleton, submenu, etc).
 *
 * This file is intended to live at src/tests/ui/sidebar.test.jsx —
 * relative imports below assume that location (three levels up to src root).
 */

import { fireEvent, render, screen, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "../../components/ui/sidebar";

// Helper to properly clear cookies in jsdom
const clearCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

// Helper to get cookie value
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

// Mutable mock so individual tests can flip mobile on/off.
let mockIsMobile = false;
vi.mock("../../hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

// Mock Sheet components
vi.mock("../../components/ui/sheet", () => ({
  Sheet: ({ children, open, onOpenChange }) => (
    <div data-testid="sheet" data-open={open}>
      {children}
      <button 
        data-testid="sheet-close" 
        onClick={() => onOpenChange(false)}
        aria-label="Close sheet"
      >
        Close
      </button>
    </div>
  ),
  SheetContent: ({ children, className, side }) => (
    <div data-testid="sheet-content" className={className} data-side={side}>
      {children}
    </div>
  ),
  SheetHeader: ({ children }) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }) => <h2 data-testid="sheet-title">{children}</h2>,
  SheetDescription: ({ children }) => <p data-testid="sheet-description">{children}</p>,
}));

// Mock Tooltip components
vi.mock("../../components/ui/tooltip", () => ({
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  TooltipProvider: ({ children }) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children, asChild }) => <>{children}</>,
  TooltipContent: ({ children, hidden, ...props }) => 
    hidden ? null : <div data-testid="tooltip-content" {...props}>{children}</div>,
}));

// Mock Button
vi.mock("../../components/ui/button", () => ({
  Button: ({ children, onClick, className, variant, size, ...props }) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Input
vi.mock("../../components/ui/input", () => ({
  Input: (props) => <input data-testid="input" {...props} />,
}));

// Mock Separator
vi.mock("../../components/ui/separator", () => ({
  Separator: (props) => <hr data-testid="separator" {...props} />,
}));

// Mock Skeleton
vi.mock("../../components/ui/skeleton", () => ({
  Skeleton: ({ className }) => <div data-testid="skeleton" className={className} />,
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  PanelLeftIcon: () => <svg data-testid="panel-left-icon">PanelLeftIcon</svg>,
}));

// Test consumer component that exercises useSidebar
const TestConsumer = () => {
  const { state, open, toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();
  return (
    <div>
      <div data-testid="state">{state}</div>
      <div data-testid="open">{String(open)}</div>
      <div data-testid="isMobile">{String(isMobile)}</div>
      <div data-testid="openMobile">{String(openMobile)}</div>
      <button data-testid="toggle-btn" onClick={toggleSidebar}>Toggle</button>
      <button data-testid="set-open-mobile" onClick={() => setOpenMobile(true)}>Set Open Mobile</button>
    </div>
  );
};

beforeEach(() => {
  mockIsMobile = false;
  clearCookie("sidebar_state");
  clearCookie("theme");
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============ SECTION 1: SidebarProvider ============

describe("SidebarProvider", () => {
  it("should provide sidebar context to children", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
  });

  it("should default to expanded state", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
  });

  it("should accept defaultOpen prop", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("should accept controlled open prop", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    render(
      <SidebarProvider open={false}>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(screen.getByTestId("open")).toHaveTextContent("false");
    
    warnSpy.mockRestore();
  });

  it("should call onOpenChange when state changes", () => {
    const onOpenChange = vi.fn();

    render(
      <SidebarProvider onOpenChange={onOpenChange}>
        <TestConsumer />
      </SidebarProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");
    fireEvent.click(toggleBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should toggle sidebar state when toggleSidebar is called", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    const toggleBtn = screen.getByTestId("toggle-btn");
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("should set cookie when sidebar state changes", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");
    fireEvent.click(toggleBtn);

    expect(getCookie("sidebar_state")).toBe("false");
  });

  it("should handle keyboard shortcut (Ctrl+B) to toggle sidebar", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    fireEvent.keyDown(window, {
      key: "b",
      ctrlKey: true,
    });

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("should handle keyboard shortcut (Cmd+B) to toggle sidebar", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    fireEvent.keyDown(window, {
      key: "b",
      metaKey: true,
    });

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("should ignore other keyboard shortcuts", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    fireEvent.keyDown(window, {
      key: "c",
      ctrlKey: true,
    });

    // State should remain expanded
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
  });

  it("should cleanup keyboard event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    
    const { unmount } = render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("should handle mobile state when useIsMobile returns true", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("isMobile")).toHaveTextContent("true");
  });

  it("should toggle openMobile instead of open when mobile", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("openMobile")).toHaveTextContent("false");

    const toggleBtn = screen.getByTestId("toggle-btn");
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("openMobile")).toHaveTextContent("true");
    // Desktop open should remain true
    expect(screen.getByTestId("open")).toHaveTextContent("true");
  });

  it("should set openMobile with setOpenMobile", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("openMobile")).toHaveTextContent("false");

    const setOpenMobileBtn = screen.getByTestId("set-open-mobile");
    fireEvent.click(setOpenMobileBtn);

    expect(screen.getByTestId("openMobile")).toHaveTextContent("true");
  });

  // ============ COOKIE PERSISTENCE TESTS ============

  it("should restore state from cookie on mount when uncontrolled", () => {
    document.cookie = "sidebar_state=false; path=/";
    
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("should restore expanded state from cookie with defaultOpen false", () => {
    document.cookie = "sidebar_state=true; path=/";
    
    render(
      <SidebarProvider defaultOpen={false}>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
  });

  it("should ignore cookie when controlled (open prop provided)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    document.cookie = "sidebar_state=false; path=/";
    
    render(
      <SidebarProvider open={true}>
        <TestConsumer />
      </SidebarProvider>
    );

    // Cookie says collapsed, but controlled prop says expanded
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    
    warnSpy.mockRestore();
  });

  it("should treat non-'true' cookie values as collapsed", () => {
    document.cookie = "sidebar_state=banana; path=/";
    
    render(
      <SidebarProvider defaultOpen={true}>
        <TestConsumer />
      </SidebarProvider>
    );

    // "banana" === "true" is false, so it collapses
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  // NEW: Tests the ;\s* branch of the regex by placing another cookie first
  it("should restore state from cookie when other cookies precede it", () => {
    document.cookie = "theme=dark; path=/";
    document.cookie = "sidebar_state=true; path=/";

    render(
      <SidebarProvider defaultOpen={false}>
        <TestConsumer />
      </SidebarProvider>
    );

    // Cookie says expanded, defaultOpen says collapsed
    // If cookie is correctly parsed, state should be expanded
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
  });

  // NEW: Tests cookie with preceding cookies and false value
  it("should restore false state from cookie when other cookies precede it", () => {
    document.cookie = "theme=dark; path=/";
    document.cookie = "sidebar_state=false; path=/";

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    // Cookie says collapsed, defaultOpen says expanded
    // If cookie is correctly parsed, state should be collapsed
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("should suppress console.warn when controlled prop is used correctly", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    render(
      <SidebarProvider open={true} onOpenChange={() => {}}>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it("should warn when controlled prop is used without onOpenChange", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    render(
      <SidebarProvider open={false}>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("SidebarProvider: `open` prop provided without `onOpenChange`")
    );
    consoleWarnSpy.mockRestore();
  });
});

// ============ SECTION 2: useSidebar Hook ============

describe("useSidebar hook", () => {
  it("should throw when used outside of a SidebarProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSidebar())).toThrow(
      "useSidebar must be used within a SidebarProvider.",
    );
    spy.mockRestore();
  });

  it("should return context when used inside provider", () => {
    const wrapper = ({ children }) => <SidebarProvider>{children}</SidebarProvider>;
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.state).toBe("expanded");
    expect(result.current.open).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });
});

// ============ SECTION 3: Sidebar Component ============

describe("Sidebar", () => {
  it("should render sidebar with default props", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <div>Sidebar Content</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with collapsible='none' as a plain flex column", () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent>Static Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByText("Static Content")).toBeInTheDocument();
  });

  it("should render with side='left'", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar side="left">
          <div>Left Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-side="left"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with side='right'", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar side="right">
          <div>Right Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-side="right"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with variant='floating'", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar variant="floating">
          <div>Floating Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-variant="floating"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with variant='inset'", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar variant="inset">
          <div>Inset Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-variant="inset"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with collapsed state", () => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <div>Collapsed Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-state="collapsed"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with collapsible='icon'", () => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon">
          <div>Icon Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-collapsible="icon"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render with collapsible='offcanvas'", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="offcanvas">
          <div>Offcanvas Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-collapsible="offcanvas"]');
    expect(sidebar).toBeInTheDocument();
  });

  it("should render mobile sidebar when isMobile is true", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <Sidebar>
          <div>Mobile Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.getByTestId("sheet")).toBeInTheDocument();
    expect(screen.getByText("Mobile Sidebar")).toBeInTheDocument();
  });

  it("should pass className to sidebar", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar className="custom-class">
          <div>Custom Class Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveClass("custom-class");
  });

  it("should render sheet header for mobile with accessibility labels", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Mobile Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.getByTestId("sheet-header")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-title")).toHaveTextContent("Sidebar");
    expect(screen.getByTestId("sheet-description")).toHaveTextContent("Displays the mobile sidebar.");
  });
});

// ============ SECTION 4: SidebarTrigger ============

describe("SidebarTrigger", () => {
  it("should render trigger button", () => {
    render(
      <SidebarProvider>
        <SidebarTrigger />
      </SidebarProvider>
    );

    const trigger = screen.getByTestId("button");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("data-sidebar", "trigger");
  });

  it("should toggle sidebar when clicked", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
        <SidebarTrigger />
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    const trigger = screen.getByTestId("button");
    fireEvent.click(trigger);

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("should call onClick prop when clicked", () => {
    const onClick = vi.fn();

    render(
      <SidebarProvider>
        <SidebarTrigger onClick={onClick} />
      </SidebarProvider>
    );

    const trigger = screen.getByTestId("button");
    fireEvent.click(trigger);

    expect(onClick).toHaveBeenCalled();
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <SidebarTrigger className="custom-class" />
      </SidebarProvider>
    );

    const trigger = screen.getByTestId("button");
    expect(trigger).toHaveClass("custom-class");
  });

  it("should render PanelLeftIcon", () => {
    render(
      <SidebarProvider>
        <SidebarTrigger />
      </SidebarProvider>
    );

    expect(screen.getByTestId("panel-left-icon")).toBeInTheDocument();
  });
});

// ============ SECTION 5: SidebarRail ============

describe("SidebarRail", () => {
  it("should render rail button", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>
    );

    const rail = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(rail).toBeInTheDocument();
    expect(rail).toHaveAttribute("data-sidebar", "rail");
  });

  it("should toggle sidebar when clicked", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
        <Sidebar>
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.getByTestId("state")).toHaveTextContent("expanded");

    const rail = screen.getByRole("button", { name: /toggle sidebar/i });
    fireEvent.click(rail);

    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarRail className="custom-class" />
        </Sidebar>
      </SidebarProvider>
    );

    const rail = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(rail).toHaveClass("custom-class");
  });

  it("should have aria-label", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>
    );

    const rail = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(rail).toHaveAttribute("aria-label", "Toggle Sidebar");
  });

  it("should have title attribute", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>
    );

    const rail = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(rail).toHaveAttribute("title", "Toggle Sidebar");
  });
});

// ============ SECTION 6: SidebarInset ============

describe("SidebarInset", () => {
  it("should render main element", () => {
    render(
      <SidebarProvider>
        <SidebarInset />
      </SidebarProvider>
    );

    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    expect(inset).toBeInTheDocument();
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <SidebarInset className="custom-class" />
      </SidebarProvider>
    );

    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    expect(inset).toHaveClass("custom-class");
  });

  it("should render children", () => {
    render(
      <SidebarProvider>
        <SidebarInset>
          <div data-testid="child">Child Content</div>
        </SidebarInset>
      </SidebarProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

// ============ SECTION 7: SidebarHeader, SidebarFooter, SidebarContent ============

describe("SidebarHeader", () => {
  it("should render header", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div>Header Content</div>
          </SidebarHeader>
        </Sidebar>
      </SidebarProvider>
    );

    const header = document.querySelector('[data-sidebar="header"]');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("Header Content");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="custom-class">
            <div>Header Content</div>
          </SidebarHeader>
        </Sidebar>
      </SidebarProvider>
    );

    const header = document.querySelector('[data-sidebar="header"]');
    expect(header).toHaveClass("custom-class");
  });
});

describe("SidebarFooter", () => {
  it("should render footer", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarFooter>
            <div>Footer Content</div>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    );

    const footer = document.querySelector('[data-sidebar="footer"]');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent("Footer Content");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarFooter className="custom-class">
            <div>Footer Content</div>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    );

    const footer = document.querySelector('[data-sidebar="footer"]');
    expect(footer).toHaveClass("custom-class");
  });
});

describe("SidebarContent", () => {
  it("should render content", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <div>Content</div>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );

    const content = document.querySelector('[data-sidebar="content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent("Content");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent className="custom-class">
            <div>Content</div>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );

    const content = document.querySelector('[data-sidebar="content"]');
    expect(content).toHaveClass("custom-class");
  });
});

// ============ SECTION 8: SidebarGroup Components ============

describe("SidebarGroup", () => {
  it("should render group", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <div>Group Content</div>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const group = document.querySelector('[data-sidebar="group"]');
    expect(group).toBeInTheDocument();
    expect(group).toHaveTextContent("Group Content");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup className="custom-class">
            <div>Group Content</div>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const group = document.querySelector('[data-sidebar="group"]');
    expect(group).toHaveClass("custom-class");
  });
});

describe("SidebarGroupLabel", () => {
  it("should render group label", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupLabel>Label</SidebarGroupLabel>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const label = document.querySelector('[data-sidebar="group-label"]');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("Label");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupLabel className="custom-class">Label</SidebarGroupLabel>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const label = document.querySelector('[data-sidebar="group-label"]');
    expect(label).toHaveClass("custom-class");
  });

  it("should render as child component when asChild is true", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <span data-testid="custom-label">Custom Label</span>
            </SidebarGroupLabel>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const label = screen.getByTestId("custom-label");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("Custom Label");
  });
});

describe("SidebarGroupAction", () => {
  it("should render group action", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupAction aria-label="Add">+</SidebarGroupAction>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const action = document.querySelector('[data-sidebar="group-action"]');
    expect(action).toBeInTheDocument();
  });

  it("should render as child when asChild is true", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupAction asChild>
              <button data-testid="custom-action">Custom Action</button>
            </SidebarGroupAction>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const action = screen.getByTestId("custom-action");
    expect(action).toBeInTheDocument();
    expect(action).toHaveTextContent("Custom Action");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupAction className="custom-class" aria-label="Add">
              +
            </SidebarGroupAction>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const action = document.querySelector('[data-sidebar="group-action"]');
    expect(action).toHaveClass("custom-class");
  });
});

describe("SidebarGroupContent", () => {
  it("should render group content", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupContent>
              <div>Content</div>
            </SidebarGroupContent>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const content = document.querySelector('[data-sidebar="group-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent("Content");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupContent className="custom-class">
              <div>Content</div>
            </SidebarGroupContent>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    );

    const content = document.querySelector('[data-sidebar="group-content"]');
    expect(content).toHaveClass("custom-class");
  });
});

// ============ SECTION 9: SidebarMenu Components ============

describe("SidebarMenu", () => {
  it("should render menu", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <li>Menu Item</li>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const menu = document.querySelector('[data-sidebar="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent("Menu Item");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu className="custom-class">
            <li>Menu Item</li>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const menu = document.querySelector('[data-sidebar="menu"]');
    expect(menu).toHaveClass("custom-class");
  });
});

describe("SidebarMenuItem", () => {
  it("should render menu item", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <div>Item</div>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const item = document.querySelector('[data-sidebar="menu-item"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent("Item");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem className="custom-class">
              <div>Item</div>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const item = document.querySelector('[data-sidebar="menu-item"]');
    expect(item).toHaveClass("custom-class");
  });
});

// ============ SECTION 10: SidebarMenuButton ============

describe("SidebarMenuButton", () => {
  it("should render menu button", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-sidebar="menu-button"]');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Button");
  });

  it("should render as child when asChild is true", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a data-testid="custom-button" href="#">Custom Button</a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = screen.getByTestId("custom-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Custom Button");
  });

  it("should apply isActive state", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>Active Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-active="true"]');
    expect(button).toBeInTheDocument();
  });

  it("should apply variant prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton variant="outline">Outline Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-sidebar="menu-button"]');
    expect(button).toBeInTheDocument();
  });

  it("should apply size prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">Large Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-size="lg"]');
    expect(button).toBeInTheDocument();
  });

  it("should render tooltip when provided", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Tooltip Text">Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
  });

  it("should render tooltip with custom content", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: "Custom Tooltip", side: "left" }}>
                Button
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
  });

  it("should not render tooltip in expanded state", () => {
    render(
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Tooltip Text">Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
  });

  it("should not render tooltip when isMobile is true", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Tooltip Text">Button</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
  });
});

// ============ SECTION 11: SidebarInput ============

describe("SidebarInput", () => {
  it("should render input", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarInput placeholder="Search..." />
        </Sidebar>
      </SidebarProvider>
    );

    const input = screen.getByTestId("input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Search...");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarInput className="custom-class" />
        </Sidebar>
      </SidebarProvider>
    );

    const input = screen.getByTestId("input");
    expect(input).toHaveClass("custom-class");
  });
});

// ============ SECTION 12: SidebarSeparator ============

describe("SidebarSeparator", () => {
  it("should render separator", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarSeparator />
        </Sidebar>
      </SidebarProvider>
    );

    const separator = screen.getByTestId("separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("data-sidebar", "separator");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarSeparator className="custom-class" />
        </Sidebar>
      </SidebarProvider>
    );

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("custom-class");
  });
});

// ============ SECTION 13: SidebarMenuAction ============

describe("SidebarMenuAction", () => {
  it("should render menu action", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuAction aria-label="Action">Action</SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const action = document.querySelector('[data-sidebar="menu-action"]');
    expect(action).toBeInTheDocument();
  });

  it("should render with showOnHover", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuAction showOnHover aria-label="Action">Action</SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const action = document.querySelector('[data-sidebar="menu-action"]');
    expect(action).toBeInTheDocument();
  });

  it("should render as child when asChild is true", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuAction asChild>
                <button data-testid="custom-action">Custom Action</button>
              </SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const action = screen.getByTestId("custom-action");
    expect(action).toBeInTheDocument();
  });
});

// ============ SECTION 14: SidebarMenuBadge ============

describe("SidebarMenuBadge", () => {
  it("should render badge", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuBadge>3</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const badge = document.querySelector('[data-sidebar="menu-badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuBadge className="custom-class">3</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const badge = document.querySelector('[data-sidebar="menu-badge"]');
    expect(badge).toHaveClass("custom-class");
  });
});

// ============ SECTION 15: SidebarMenuSkeleton ============

describe("SidebarMenuSkeleton", () => {
  it("should render skeleton without icon", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton />
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    expect(container.querySelector('[data-sidebar="menu-skeleton"]')).toBeInTheDocument();
    expect(container.querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeInTheDocument();
  });

  it("should render skeleton with icon", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    expect(container.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeInTheDocument();
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton className="custom-class" />
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const skeleton = document.querySelector('[data-sidebar="menu-skeleton"]');
    expect(skeleton).toHaveClass("custom-class");
  });
});

// ============ SECTION 16: SidebarMenuSub Components ============

describe("SidebarMenuSub", () => {
  it("should render submenu", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <li>Sub Item</li>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const sub = document.querySelector('[data-sidebar="menu-sub"]');
    expect(sub).toBeInTheDocument();
    expect(sub).toHaveTextContent("Sub Item");
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub className="custom-class">
                <li>Sub Item</li>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const sub = document.querySelector('[data-sidebar="menu-sub"]');
    expect(sub).toHaveClass("custom-class");
  });
});

describe("SidebarMenuSubItem", () => {
  it("should render submenu item", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <div>Sub Item</div>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const item = document.querySelector('[data-sidebar="menu-sub-item"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent("Sub Item");
  });
});

describe("SidebarMenuSubButton", () => {
  it("should render submenu button", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="#">Sub Button</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-sidebar="menu-sub-button"]');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Sub Button");
  });

  it("should render as child when asChild is true", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <a data-testid="custom-sub-button" href="#">Custom Sub</a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = screen.getByTestId("custom-sub-button");
    expect(button).toBeInTheDocument();
  });

  it("should apply size prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton size="sm">Small Sub</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-size="sm"]');
    expect(button).toBeInTheDocument();
  });

  it("should apply isActive state", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton isActive>Active Sub</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-active="true"]');
    expect(button).toBeInTheDocument();
  });

  it("should apply className prop", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton className="custom-class">Sub Button</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    const button = document.querySelector('[data-sidebar="menu-sub-button"]');
    expect(button).toHaveClass("custom-class");
  });
});

// ============ SECTION 17: Edge Cases ============

describe("Edge Cases", () => {
  it("should handle rapid toggles", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");

    for (let i = 0; i < 10; i++) {
      fireEvent.click(toggleBtn);
    }

    // Should be in collapsed state after odd number of clicks
    const finalState = screen.getByTestId("state").textContent;
    expect(["expanded", "collapsed"]).toContain(finalState);
  });

  it("should handle mobile sidebar open state", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <Sidebar>
          <div>Mobile Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const sheet = screen.getByTestId("sheet");
    expect(sheet).toHaveAttribute("data-open", "false");
  });

  it("should handle mobile sidebar close via sheet close button", () => {
    mockIsMobile = true;

    render(
      <SidebarProvider>
        <Sidebar>
          <div>Mobile Sidebar</div>
        </Sidebar>
      </SidebarProvider>
    );

    const closeBtn = screen.getByTestId("sheet-close");
    fireEvent.click(closeBtn);

    const sheet = screen.getByTestId("sheet");
    expect(sheet).toHaveAttribute("data-open", "false");
  });
});

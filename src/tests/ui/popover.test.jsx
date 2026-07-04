import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

// Mock Radix UI Popover to avoid DOMRect/undefined errors
vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children, open, defaultOpen, ...props }) => (
    <div data-testid="popover-root" data-open={open || defaultOpen} {...props}>
      {children}
    </div>
  ),
  Trigger: ({ children, ...props }) => (
    <button data-testid="popover-trigger" {...props}>
      {children}
    </button>
  ),
  Content: ({ children, ...props }) => (
    <div data-testid="popover-content" {...props}>
      {children}
    </div>
  ),
  Anchor: ({ children, ...props }) => (
    <div data-testid="popover-anchor" {...props}>
      {children}
    </div>
  ),
  Portal: ({ children }) => <>{children}</>,
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Mock window methods for Popover
beforeEach(() => {
  window.setTimeout = vi.fn().mockImplementation((cb) => {
    cb();
    return 123;
  });
  window.clearTimeout = vi.fn();
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  vi.clearAllMocks();
});

describe("Popover Components", () => {
  it("renders PopoverTrigger", () => {
    const { container } = render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
      </Popover>,
    );
    // Use the mocked testid or the data-slot attribute
    const triggerElements = screen.getAllByText("Open");
    expect(triggerElements.length).toBeGreaterThan(0);
    expect(
      container.querySelector('[data-slot="popover-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders PopoverAnchor", () => {
    const { container } = render(
      <Popover>
        <PopoverAnchor>Anchor</PopoverAnchor>
      </Popover>,
    );
    const anchorElements = screen.getAllByText("Anchor");
    expect(anchorElements.length).toBeGreaterThan(0);
    expect(
      container.querySelector('[data-slot="popover-anchor"]'),
    ).toBeInTheDocument();
  });

  it("renders complete popover", () => {
    render(
      <Popover open>
        <PopoverTrigger>Trigger</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );

    const triggerElements = screen.getAllByText("Trigger");
    expect(triggerElements.length).toBeGreaterThan(0);

    const contentElements = screen.getAllByText("Content");
    expect(contentElements.length).toBeGreaterThan(0);

    // Verify the popover is open
    const rootElements = screen.getAllByTestId("popover-root");
    expect(rootElements.length).toBeGreaterThan(0);
    expect(rootElements[0]).toHaveAttribute("data-open", "true");
  });
});

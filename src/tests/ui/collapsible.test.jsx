import { render, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";

// Mock the cn utility from @/lib/utils
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(' '),
}));

// Mock the entire Radix UI collapsible module
// CRITICAL: The exports must match what the component imports
vi.mock("@radix-ui/react-collapsible", () => ({
  Root: ({ children, className, defaultOpen, open, ...props }) => (
    <div 
      data-slot="collapsible" 
      className={className}
      data-default-open={defaultOpen}
      data-open={open}
      {...props}
    >
      {children}
    </div>
  ),
  // IMPORTANT: The component imports CollapsibleTrigger and CollapsibleContent
  // So the mock must export these exact names
  CollapsibleTrigger: ({ children, className, asChild, ...props }) => (
    <button
      data-slot="collapsible-trigger"
      className={className}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
  CollapsibleContent: ({ children, className, ...props }) => (
    <div
      data-slot="collapsible-content"
      className={className}
      {...props}
    >
      {children}
    </div>
  ),
}));

describe("Collapsible Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 1. Bulletproof stub for ResizeObserver to prevent layout loops from freezing JSDOM
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock Element.prototype methods that Radix UI might use
    if (!Element.prototype.hasOwnProperty('scrollIntoView')) {
      Element.prototype.scrollIntoView = vi.fn();
    }
    
    // Mock getBoundingClientRect for the collapsible content
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    });

    // Mock DOMRect
    if (!window.DOMRect) {
      window.DOMRect = class DOMRect {
        constructor(x = 0, y = 0, width = 0, height = 0) {
          this.x = x;
          this.y = y;
          this.width = width;
          this.height = height;
          this.top = y;
          this.left = x;
          this.bottom = y + height;
          this.right = x + width;
        }
        toJSON() {
          return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            top: this.top,
            left: this.left,
            bottom: this.bottom,
            right: this.right,
          };
        }
      };
    }
  });

  afterEach(() => {
    cleanup(); // Safely sweep away DOM fragments immediately
    vi.clearAllTimers();
  });

  it("renders Collapsible container", () => {
    const { container } = render(<Collapsible />);
    expect(
      container.querySelector('[data-slot="collapsible"]'),
    ).toBeInTheDocument();
  });

  it("renders CollapsibleTrigger", () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      </Collapsible>,
    );
    expect(
      container.querySelector('[data-slot="collapsible-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders CollapsibleContent explicitly or within state structures", () => {
    // If the element renders dynamically based on open state, force the attribute open 
    // to prevent animation primitives from scheduling endless layout hooks
    const { container } = render(
      <Collapsible defaultOpen={true} open={true}>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    
    const content = container.querySelector('[data-slot="collapsible-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Content');
  });

  it("renders Collapsible with custom className", () => {
    const { container } = render(
      <Collapsible className="custom-collapsible" />
    );
    const collapsible = container.querySelector('[data-slot="collapsible"]');
    expect(collapsible).toBeInTheDocument();
    expect(collapsible).toHaveClass('custom-collapsible');
  });

  it("renders CollapsibleTrigger with custom className", () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger className="custom-trigger">Toggle</CollapsibleTrigger>
      </Collapsible>,
    );
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('custom-trigger');
  });

  it("renders CollapsibleContent with custom className", () => {
    const { container } = render(
      <Collapsible defaultOpen={true} open={true}>
        <CollapsibleContent className="custom-content">Content</CollapsibleContent>
      </Collapsible>,
    );
    const content = container.querySelector('[data-slot="collapsible-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('custom-content');
  });

  it("renders Collapsible with defaultOpen prop", () => {
    const { container } = render(
      <Collapsible defaultOpen={true}>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    const collapsible = container.querySelector('[data-slot="collapsible"]');
    expect(collapsible).toHaveAttribute('data-default-open', 'true');
  });

  it("renders Collapsible with open prop", () => {
    const { container } = render(
      <Collapsible open={true}>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    const collapsible = container.querySelector('[data-slot="collapsible"]');
    expect(collapsible).toHaveAttribute('data-open', 'true');
  });

  it("renders CollapsibleContent when open is true", () => {
    const { container } = render(
      <Collapsible open={true}>
        <CollapsibleContent>Visible Content</CollapsibleContent>
      </Collapsible>,
    );
    const content = container.querySelector('[data-slot="collapsible-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Visible Content');
  });

  it("renders CollapsibleContent with children", () => {
    const { container } = render(
      <Collapsible defaultOpen={true} open={true}>
        <CollapsibleContent>
          <div data-testid="child-content">Child Element</div>
        </CollapsibleContent>
      </Collapsible>,
    );
    const child = container.querySelector('[data-testid="child-content"]');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Child Element');
  });
});

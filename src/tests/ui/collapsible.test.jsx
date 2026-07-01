import { render, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";

describe("Collapsible Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 1. Bulletproof stub for ResizeObserver to prevent layout loops from freezing JSDOM
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
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
  });
});

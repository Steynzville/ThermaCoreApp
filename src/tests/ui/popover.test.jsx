import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

// Mock window methods for Popover
beforeEach(() => {
  window.setTimeout = vi.fn().mockImplementation((cb) => {
    cb();
    return 123;
  });
  window.clearTimeout = vi.fn();
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
});

describe("Popover Components", () => {
  it("renders PopoverTrigger", () => {
    const { container } = render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
      </Popover>,
    );
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
  });
});

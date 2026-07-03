import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";

// Mock window methods for Sheet
beforeEach(() => {
  window.setTimeout = vi.fn().mockImplementation((cb) => {
    cb();
    return 123;
  });
  window.clearTimeout = vi.fn();
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
});

describe("Sheet Components", () => {
  it("renders SheetTrigger", () => {
    const { container } = render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
      </Sheet>,
    );
    expect(
      container.querySelector('[data-slot="sheet-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders SheetHeader", () => {
    const { container } = render(<SheetHeader>Header</SheetHeader>);
    expect(
      container.querySelector('[data-slot="sheet-header"]'),
    ).toBeInTheDocument();
  });

  it("renders SheetFooter", () => {
    const { container } = render(<SheetFooter>Footer</SheetFooter>);
    expect(
      container.querySelector('[data-slot="sheet-footer"]'),
    ).toBeInTheDocument();
  });

  it("renders complete sheet structure", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description text</SheetDescription>
          </SheetHeader>
          <div>Content</div>
          <SheetFooter>
            <SheetClose>Close</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    
    const titleElements = screen.getAllByText("Sheet Title");
    expect(titleElements.length).toBeGreaterThan(0);
    
    const descElements = screen.getAllByText("Sheet description text");
    expect(descElements.length).toBeGreaterThan(0);
    
    const contentElements = screen.getAllByText("Content");
    expect(contentElements.length).toBeGreaterThan(0);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    expect(screen.getByText("Sheet Title")).toBeInTheDocument();
    expect(screen.getByText("Sheet description text")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

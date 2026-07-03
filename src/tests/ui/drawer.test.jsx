import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../components/ui/drawer";

// Mock window methods for Drawer
beforeEach(() => {
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe("Drawer Components", () => {
  it("renders DrawerTrigger", () => {
    const { container } = render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
      </Drawer>,
    );
    expect(
      container.querySelector('[data-slot="drawer-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders DrawerHeader", () => {
    const { container } = render(<DrawerHeader>Header</DrawerHeader>);
    expect(
      container.querySelector('[data-slot="drawer-header"]'),
    ).toBeInTheDocument();
  });

  it("renders DrawerFooter", () => {
    const { container } = render(<DrawerFooter>Footer</DrawerFooter>);
    expect(
      container.querySelector('[data-slot="drawer-footer"]'),
    ).toBeInTheDocument();
  });

  it("renders complete drawer structure", () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Drawer description text</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );
    
    const titleElements = screen.getAllByText("Drawer Title");
    expect(titleElements.length).toBeGreaterThan(0);
    
    const descElements = screen.getAllByText("Drawer description text");
    expect(descElements.length).toBeGreaterThan(0);
    
    const closeElements = screen.getAllByText("Close");
    expect(closeElements.length).toBeGreaterThan(0);
  });
});

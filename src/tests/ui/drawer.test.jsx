import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("Drawer Components", () => {
  it("renders DrawerTrigger", () => {
    const { container } = render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
      </Drawer>
    );
    expect(container.querySelector('[data-slot="drawer-trigger"]')).toBeInTheDocument();
  });

  it("renders DrawerHeader", () => {
    const { container } = render(<DrawerHeader>Header</DrawerHeader>);
    expect(container.querySelector('[data-slot="drawer-header"]')).toBeInTheDocument();
  });

  it("renders DrawerFooter", () => {
    const { container } = render(<DrawerFooter>Footer</DrawerFooter>);
    expect(container.querySelector('[data-slot="drawer-footer"]')).toBeInTheDocument();
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
      </Drawer>
    );
    expect(screen.getByText("Drawer Title")).toBeInTheDocument();
    expect(screen.getByText("Drawer description text")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });
});

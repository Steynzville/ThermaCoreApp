/**
 * Menubar component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

function BasicMenubar() {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger data-testid="file-trigger">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Export Log</MenubarItem>
          <MenubarItem>Print Report</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger data-testid="view-trigger">View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Toggle Grid</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe("Menubar", () => {
  it("renders all top-level menu triggers", () => {
    render(<BasicMenubar />);
    expect(screen.getByTestId("file-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("view-trigger")).toBeInTheDocument();
  });

  it("does not show menu content until a trigger is clicked", () => {
    render(<BasicMenubar />);
    expect(screen.queryByText("Export Log")).not.toBeInTheDocument();
  });

  it("opens a menu's content when its trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<BasicMenubar />);

    await user.click(screen.getByTestId("file-trigger"));

    expect(await screen.findByText("Export Log")).toBeInTheDocument();
    expect(screen.getByText("Print Report")).toBeInTheDocument();
  });

  it("switches to an adjacent menu when hovering another trigger while one is open", async () => {
    const user = userEvent.setup();
    render(<BasicMenubar />);

    await user.click(screen.getByTestId("file-trigger"));
    expect(await screen.findByText("Export Log")).toBeInTheDocument();

    await user.click(screen.getByTestId("view-trigger"));
    expect(await screen.findByText("Toggle Grid")).toBeInTheDocument();
    expect(screen.queryByText("Export Log")).not.toBeInTheDocument();
  });

  it("calls onSelect when a menu item is chosen", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger data-testid="file-trigger">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={onSelect}>Export Log</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByTestId("file-trigger"));
    await user.click(await screen.findByText("Export Log"));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks a destructive item with data-variant='destructive'", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger data-testid="file-trigger">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem variant="destructive" data-testid="danger-item">
              Purge History
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByTestId("file-trigger"));
    expect(await screen.findByTestId("danger-item")).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("toggles a checkbox item", async () => {
    function Wrapper() {
      const [checked, setChecked] = useState(false);
      return (
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger data-testid="view-trigger">View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                checked={checked}
                onCheckedChange={setChecked}
                data-testid="grid-item"
              >
                Show Grid
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId("view-trigger"));
    let item = await screen.findByTestId("grid-item");
    expect(item).toHaveAttribute("data-state", "unchecked");

    await user.click(item);

    await user.click(screen.getByTestId("view-trigger"));
    item = await screen.findByTestId("grid-item");
    expect(item).toHaveAttribute("data-state", "checked");
  });

  it("selects one item within a radio group", async () => {
    function Wrapper() {
      const [unit, setUnit] = useState("psi");
      return (
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger data-testid="units-trigger">Units</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value={unit} onValueChange={setUnit}>
                <MenubarRadioItem value="psi" data-testid="unit-psi">
                  PSI
                </MenubarRadioItem>
                <MenubarRadioItem value="bar" data-testid="unit-bar">
                  Bar
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId("units-trigger"));
    await user.click(screen.getByTestId("unit-bar"));

    await user.click(screen.getByTestId("units-trigger"));
    expect(await screen.findByTestId("unit-bar")).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("renders a label and separator", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger data-testid="file-trigger">File</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel>Report Actions</MenubarLabel>
            <MenubarItem>Export Log</MenubarItem>
            <MenubarSeparator data-testid="separator" />
            <MenubarItem>
              Print
              <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByTestId("file-trigger"));
    expect(await screen.findByText("Report Actions")).toBeInTheDocument();
    expect(screen.getByTestId("separator")).toBeInTheDocument();
    expect(screen.getByText("⌘P")).toBeInTheDocument();
  });

  it("opens a submenu and shows its items", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger data-testid="file-trigger">File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger data-testid="sub-trigger">
                Export As
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>CSV</MenubarItem>
                <MenubarItem>PDF</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    await user.click(screen.getByTestId("file-trigger"));
    const subTrigger = await screen.findByTestId("sub-trigger");
    await user.click(subTrigger);

    expect(await screen.findByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("closes an open menu on Escape", async () => {
    const user = userEvent.setup();
    render(<BasicMenubar />);

    await user.click(screen.getByTestId("file-trigger"));
    expect(await screen.findByText("Export Log")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Export Log")).not.toBeInTheDocument();
  });
});

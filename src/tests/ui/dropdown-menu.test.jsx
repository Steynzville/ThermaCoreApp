/**
 * DropdownMenu component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * Unlike ContextMenu (opens on right-click), Radix's DropdownMenu opens on a
 * regular left-click/Enter/Space on the trigger.
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

describe("DropdownMenu", () => {
  it("does not render menu content until the trigger is activated", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Acknowledge</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.queryByText("Acknowledge")).not.toBeInTheDocument();
  });

  it("opens the menu when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Acknowledge Alarm</DropdownMenuItem>
          <DropdownMenuItem>Silence Horn</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByText("Acknowledge Alarm")).toBeInTheDocument();
    expect(screen.getByText("Silence Horn")).toBeInTheDocument();
  });

  it("opens the menu with keyboard activation (Enter) and closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Acknowledge Alarm</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    screen.getByTestId("trigger").focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Acknowledge Alarm")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Acknowledge Alarm")).not.toBeInTheDocument();
  });

  it("calls onSelect when an item is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Export Report</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByText("Export Report"));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks a destructive item with data-variant='destructive'", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive" data-testid="danger-item">
            Force Shutdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByTestId("danger-item")).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("does not fire onSelect for a disabled item", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled onSelect={onSelect}>
            Reset Totalizer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByText("Reset Totalizer"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("toggles a checkbox item's checked state", async () => {
    function Wrapper() {
      const [checked, setChecked] = useState(false);
      return (
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="trigger">View</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={checked}
              onCheckedChange={setChecked}
              data-testid="show-raw"
            >
              Show Raw Values
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId("trigger"));
    let item = await screen.findByTestId("show-raw");
    expect(item).toHaveAttribute("data-state", "unchecked");

    await user.click(item);

    await user.click(screen.getByTestId("trigger"));
    item = await screen.findByTestId("show-raw");
    expect(item).toHaveAttribute("data-state", "checked");
  });

  it("selects a single option within a radio group", async () => {
    function Wrapper() {
      const [unit, setUnit] = useState("psi");
      return (
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="trigger">Units</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={unit} onValueChange={setUnit}>
              <DropdownMenuRadioItem value="psi" data-testid="unit-psi">
                PSI
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bar" data-testid="unit-bar">
                Bar
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByTestId("unit-psi")).toHaveAttribute(
      "data-state",
      "checked",
    );

    await user.click(screen.getByTestId("unit-bar"));

    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByTestId("unit-bar")).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("renders a label, separator, and shortcut hint", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tag Actions</DropdownMenuLabel>
            <DropdownMenuItem>Acknowledge</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator data-testid="separator" />
          <DropdownMenuItem>
            Export
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByText("Tag Actions")).toBeInTheDocument();
    expect(screen.getByTestId("separator")).toBeInTheDocument();
    expect(screen.getByText("⌘E")).toBeInTheDocument();
  });

  it("opens a submenu and displays its items", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-testid="sub-trigger">
              Set Alarm Priority
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>High</DropdownMenuItem>
              <DropdownMenuItem>Medium</DropdownMenuItem>
              <DropdownMenuItem>Low</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByTestId("trigger"));
    const subTrigger = await screen.findByTestId("sub-trigger");
    await user.click(subTrigger);

    expect(await screen.findByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });
});

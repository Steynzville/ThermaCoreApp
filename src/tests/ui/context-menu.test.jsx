/**
 * ContextMenu component tests
 *
 * Stack assumed: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * Radix's ContextMenu opens on a native "contextmenu" event (right-click).
 * user-event's pointer API can dispatch this via `{ keys: '[MouseRight]' }`;
 * as a fallback we also fire the raw event directly where needed.
 */
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

async function openMenu(user, triggerEl) {
  await user.pointer({ keys: "[MouseRight]", target: triggerEl });
}

describe("ContextMenu", () => {
  it("does not render menu content until the trigger is right-clicked", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">
          Right-click a tag
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Acknowledge</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    expect(screen.queryByText("Acknowledge")).not.toBeInTheDocument();
  });

  it("opens the menu content when the trigger area is right-clicked", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">
          Pump Station 1
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Acknowledge Alarm</ContextMenuItem>
          <ContextMenuItem>Silence Horn</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));

    expect(await screen.findByText("Acknowledge Alarm")).toBeInTheDocument();
    expect(screen.getByText("Silence Horn")).toBeInTheDocument();
  });

  it("calls onSelect when a menu item is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onSelect}>Acknowledge Alarm</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));
    await user.click(await screen.findByText("Acknowledge Alarm"));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("applies destructive styling classes when variant='destructive' is set on an item", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem variant="destructive" data-testid="danger-item">
            Force Shutdown
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));
    const item = await screen.findByTestId("danger-item");
    expect(item).toHaveAttribute("data-variant", "destructive");
  });

  it("renders a disabled item that cannot be selected", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled onSelect={onSelect}>
            Reset Totalizer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));
    const item = await screen.findByText("Reset Totalizer");
    await user.click(item);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("toggles a checkbox item and reflects checked state", async () => {
    function Wrapper() {
      const [checked, setChecked] = useState(false);
      return (
        <ContextMenu>
          <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem
              checked={checked}
              onCheckedChange={setChecked}
              data-testid="show-raw-values"
            >
              Show Raw Values
            </ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await openMenu(user, screen.getByTestId("trigger"));
    let item = await screen.findByTestId("show-raw-values");
    expect(item).toHaveAttribute("data-state", "unchecked");

    await user.click(item);

    await openMenu(user, screen.getByTestId("trigger"));
    item = await screen.findByTestId("show-raw-values");
    expect(item).toHaveAttribute("data-state", "checked");
  });

  it("allows selecting one option in a radio group and marks it checked", async () => {
    function Wrapper() {
      const [unit, setUnit] = useState("psi");
      return (
        <ContextMenu>
          <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value={unit} onValueChange={setUnit}>
              <ContextMenuRadioItem value="psi" data-testid="unit-psi">
                PSI
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="bar" data-testid="unit-bar">
                Bar
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await openMenu(user, screen.getByTestId("trigger"));
    expect(await screen.findByTestId("unit-psi")).toHaveAttribute(
      "data-state",
      "checked",
    );

    await user.click(screen.getByTestId("unit-bar"));

    await openMenu(user, screen.getByTestId("trigger"));
    expect(await screen.findByTestId("unit-bar")).toHaveAttribute(
      "data-state",
      "checked",
    );
    expect(await screen.findByTestId("unit-psi")).toHaveAttribute(
      "data-state",
      "unchecked",
    );
  });

  it("renders a label and separator inside a group", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuLabel>Tag Actions</ContextMenuLabel>
            <ContextMenuItem>Acknowledge</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator data-testid="separator" />
          <ContextMenuItem>
            Export
            <ContextMenuShortcut>⌘E</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));
    expect(await screen.findByText("Tag Actions")).toBeInTheDocument();
    expect(screen.getByTestId("separator")).toBeInTheDocument();
    expect(screen.getByText("⌘E")).toBeInTheDocument();
  });

  it("opens a submenu and shows its items on hover/focus", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger data-testid="sub-trigger">
              Set Alarm Priority
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>High</ContextMenuItem>
              <ContextMenuItem>Medium</ContextMenuItem>
              <ContextMenuItem>Low</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));
    const subTrigger = await screen.findByTestId("sub-trigger");
    await user.click(subTrigger);

    expect(await screen.findByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("closes the menu when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Acknowledge Alarm</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await openMenu(user, screen.getByTestId("trigger"));
    expect(await screen.findByText("Acknowledge Alarm")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Acknowledge Alarm")).not.toBeInTheDocument();
  });
});

/**
 * Command component tests
 *
 * Stack assumed: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * Uses the real `cmdk` primitive (no mocking needed) since it works fine
 * under jsdom for these interaction patterns.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

function BasicCommand({ onSelect = () => {} } = {}) {
  return (
    <Command>
      <CommandInput placeholder="Search tags or alarms..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Stations">
          <CommandItem value="Pump Station 1" onSelect={onSelect}>
            Pump Station 1
            <CommandShortcut>⌘1</CommandShortcut>
          </CommandItem>
          <CommandItem value="Pump Station 2" onSelect={onSelect}>
            Pump Station 2
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Alarms">
          <CommandItem value="Overpressure Alarm" onSelect={onSelect}>
            Overpressure Alarm
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  it("renders the search input with the given placeholder", () => {
    render(<BasicCommand />);
    expect(
      screen.getByPlaceholderText("Search tags or alarms..."),
    ).toBeInTheDocument();
  });

  it("renders all items across groups initially", () => {
    render(<BasicCommand />);
    expect(screen.getByText("Pump Station 1")).toBeInTheDocument();
    expect(screen.getByText("Pump Station 2")).toBeInTheDocument();
    expect(screen.getByText("Overpressure Alarm")).toBeInTheDocument();
  });

  it("renders group headings", () => {
    render(<BasicCommand />);
    expect(screen.getByText("Stations")).toBeInTheDocument();
    expect(screen.getByText("Alarms")).toBeInTheDocument();
  });

  it("renders a keyboard shortcut hint next to an item", () => {
    render(<BasicCommand />);
    expect(screen.getByText("⌘1")).toBeInTheDocument();
  });

  it("filters items as the user types a query matching one item", async () => {
    const user = userEvent.setup();
    render(<BasicCommand />);
    const input = screen.getByPlaceholderText("Search tags or alarms...");

    await user.type(input, "Overpressure");

    expect(screen.getByText("Overpressure Alarm")).toBeInTheDocument();
    expect(screen.queryByText("Pump Station 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Pump Station 2")).not.toBeInTheDocument();
  });

  it("shows the empty state when no item matches the query", async () => {
    const user = userEvent.setup();
    render(<BasicCommand />);
    const input = screen.getByPlaceholderText("Search tags or alarms...");

    await user.type(input, "nonexistent-tag-xyz");

    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  it("calls onSelect with the item's value when an item is chosen via click", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<BasicCommand onSelect={onSelect} />);

    await user.click(screen.getByText("Pump Station 2"));
    expect(onSelect).toHaveBeenCalledWith("Pump Station 2");
  });

  it("supports keyboard navigation and selection with ArrowDown + Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<BasicCommand onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("Search tags or alarms...");
    input.focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders a visual separator between groups", () => {
    const { container } = render(<BasicCommand />);
    expect(
      container.querySelector('[data-slot="command-separator"]'),
    ).toBeInTheDocument();
  });
});

describe("CommandDialog", () => {
  it("renders with a default sr-only title and description for accessibility", () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem value="foo">Foo</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    expect(
      screen.getByRole("dialog", { name: "Command Palette" }),
    ).toBeInTheDocument();
  });

  it("accepts a custom title and description", () => {
    render(
      <CommandDialog
        open
        title="SCADA Quick Actions"
        description="Jump to any tag, alarm, or station"
      >
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem value="foo">Foo</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    expect(
      screen.getByRole("dialog", { name: "SCADA Quick Actions" }),
    ).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    render(
      <CommandDialog open={false}>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem value="foo">Foo</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters items inside the dialog the same way as a standalone Command", async () => {
    const user = userEvent.setup();
    render(
      <CommandDialog open title="Actions" description="desc">
        <CommandInput placeholder="Search actions..." />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandItem value="Acknowledge Alarm">Acknowledge Alarm</CommandItem>
          <CommandItem value="Silence Horn">Silence Horn</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByPlaceholderText("Search actions...");
    await user.type(input, "Silence");

    expect(within(dialog).getByText("Silence Horn")).toBeInTheDocument();
    expect(within(dialog).queryByText("Acknowledge Alarm")).not.toBeInTheDocument();
  });
});

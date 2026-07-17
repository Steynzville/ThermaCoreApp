/**
 * NavigationMenu component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * Radix's NavigationMenu opens content on both hover-intent and click/keyboard
 * activation. Hover-intent relies on timers that are unreliable under jsdom,
 * so these tests drive it via click/keyboard, which Radix also supports.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

describe("NavigationMenu", () => {
  it("renders the root with viewport enabled by default", () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/dashboard">Dashboard</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const root = container.querySelector('[data-slot="navigation-menu"]');
    expect(root).toHaveAttribute("data-viewport", "true");
    expect(
      container.querySelector('[data-slot="navigation-menu-viewport"]'),
    ).toBeInTheDocument();
  });

  it("omits the shared viewport when viewport={false}", () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger data-testid="trigger">
              Stations
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/stations/1">
                Pump Station 1
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const root = container.querySelector('[data-slot="navigation-menu"]');
    expect(root).toHaveAttribute("data-viewport", "false");
    expect(
      container.querySelector('[data-slot="navigation-menu-viewport"]'),
    ).not.toBeInTheDocument();
  });

  it("renders top-level links directly (no trigger needed)", () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/alarms" data-testid="alarms-link">
              Alarms
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const link = screen.getByTestId("alarms-link");
    expect(link).toHaveAttribute("href", "/alarms");
  });

  it("opens a trigger's content on click and shows the nested links", async () => {
    const user = userEvent.setup();
    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger data-testid="trigger">
              Stations
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/stations/1">
                Pump Station 1
              </NavigationMenuLink>
              <NavigationMenuLink href="/stations/2">
                Pump Station 2
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByText("Pump Station 1")).toBeInTheDocument();
    expect(screen.getByText("Pump Station 2")).toBeInTheDocument();
  });

  it("marks the trigger's aria-expanded state when opened", async () => {
    const user = userEvent.setup();
    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger data-testid="trigger">
              Stations
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/stations/1">
                Pump Station 1
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("marks an active link with data-active for styling", () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="/dashboard"
              active
              data-testid="active-link"
            >
              Dashboard
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(screen.getByTestId("active-link")).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("exposes navigationMenuTriggerStyle() as a reusable class string for plain links", () => {
    const classes = navigationMenuTriggerStyle();
    expect(typeof classes).toBe("string");
    expect(classes).toContain("inline-flex");
  });

  it("renders the indicator element when included", () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Stations</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/stations/1">
                Pump Station 1
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(
      container.querySelector('[data-slot="navigation-menu-indicator"]'),
    ).toBeInTheDocument();
  });

  it("renders the standalone viewport with expected data-slot", () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/dashboard">Dashboard</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport data-testid="manual-viewport" />
      </NavigationMenu>,
    );
    expect(screen.getByTestId("manual-viewport")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="navigation-menu-viewport"]'))
      .toHaveLength(1);
  });
});

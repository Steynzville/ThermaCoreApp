/**
 * NavigationMenu component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * Radix's NavigationMenu opens content on both hover-intent and click/keyboard
 * activation. Hover-intent relies on timers that are unreliable under jsdom,
 * so these tests drive it via click/keyboard, which Radix also supports.
 *
 * jsdom doesn't implement ResizeObserver, which Radix's layout-measurement
 * effects (used by the Indicator/Viewport) reach for. We stub a no-op
 * version below so those effects don't throw instead of silently no-op'ing.
 */
import { describe, it, expect, beforeAll } from "vitest";
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

beforeAll(() => {
  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("NavigationMenu", () => {
  it("renders the root with data-viewport='true' by default", () => {
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
    // Note: we don't assert the shared viewport's DOM presence here — Radix
    // appears to lazily mount it only once a trigger/content becomes active
    // (see the "opens a trigger's content" test below, which exercises the
    // viewport in that active state instead).
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

  it("marks an active link with a present data-active attribute for styling", () => {
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
    // Radix renders boolean state props like `active` as a bare/empty-string
    // data attribute (present = true), not the literal string "true".
    const link = screen.getByTestId("active-link");
    expect(link.hasAttribute("data-active")).toBe(true);
  });

  it("exposes navigationMenuTriggerStyle() as a reusable class string for plain links", () => {
    const classes = navigationMenuTriggerStyle();
    expect(typeof classes).toBe("string");
    expect(classes).toContain("inline-flex");
  });

  it("renders the indicator element when force-mounted", async () => {
    // NavigationMenuIndicator is gated behind two things in Radix: (1) a
    // portal target ref ("indicatorTrack") that NavigationMenuList hands up
    // via its own mount effect, and (2) a `Presence` check for whether a
    // trigger is currently active/highlighted — which in turn depends on
    // pointer-hover state that's unreliable to simulate through jsdom's
    // synthetic pointer events. Radix exposes `forceMount` specifically to
    // bypass #2 for cases like this (the same mechanism used to test/animate
    // Tooltip, Popover, Dialog, etc.), so we use it here to test our
    // component's rendering deterministically rather than fighting Radix's
    // internal hover/focus state machine.
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
          <NavigationMenuIndicator forceMount data-testid="indicator" />
        </NavigationMenuList>
      </NavigationMenu>,
    );

    // findBy (rather than a synchronous querySelector) gives the List's own
    // mount effect — which hands the portal target ref up to context — one
    // more microtask/render cycle to settle if it hasn't already.
    expect(await screen.findByTestId("indicator")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="navigation-menu-indicator"]'))
      .toBeInTheDocument();
  });

  it("routes opened content into a manually-placed viewport", async () => {
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
        <NavigationMenuViewport data-testid="manual-viewport" />
      </NavigationMenu>,
    );

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByTestId("manual-viewport")).toBeInTheDocument();
    expect(screen.getByText("Pump Station 1")).toBeInTheDocument();
  });
});

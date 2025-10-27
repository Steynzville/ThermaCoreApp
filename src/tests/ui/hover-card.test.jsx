import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../components/ui/hover-card";

describe("HoverCard Components", () => {
  it("renders HoverCard with trigger", () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
      </HoverCard>,
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("renders HoverCardTrigger", () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
      </HoverCard>,
    );
    expect(
      container.querySelector('[data-slot="hover-card-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders complete hover card", () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardContent>Content</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });
});

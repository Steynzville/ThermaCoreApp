import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

describe("Popover Components", () => {
  it("renders PopoverTrigger", () => {
    const { container } = render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
      </Popover>,
    );
    expect(
      container.querySelector('[data-slot="popover-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders PopoverAnchor", () => {
    const { container } = render(
      <Popover>
        <PopoverAnchor>Anchor</PopoverAnchor>
      </Popover>,
    );
    expect(
      container.querySelector('[data-slot="popover-anchor"]'),
    ).toBeInTheDocument();
  });

  it("renders complete popover", () => {
    render(
      <Popover open>
        <PopoverTrigger>Trigger</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

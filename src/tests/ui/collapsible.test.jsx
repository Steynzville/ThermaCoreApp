import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";

describe("Collapsible Components", () => {
  it("renders Collapsible container", () => {
    const { container } = render(<Collapsible />);
    expect(container.querySelector('[data-slot="collapsible"]')).toBeInTheDocument();
  });

  it("renders CollapsibleTrigger", () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      </Collapsible>
    );
    expect(container.querySelector('[data-slot="collapsible-trigger"]')).toBeInTheDocument();
  });

  it("renders CollapsibleContent", () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    );
    expect(container.querySelector('[data-slot="collapsible-content"]')).toBeInTheDocument();
  });
});

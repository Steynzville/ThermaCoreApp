import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "../../components/ui/textarea";

describe("Textarea", () => {
  it("renders textarea element", () => {
    const { container } = render(<Textarea />);
    const textarea = container.querySelector('[data-slot="textarea"]');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("accepts placeholder prop", () => {
    render(<Textarea placeholder="Enter text here" />);
    expect(screen.getByPlaceholderText("Enter text here")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Textarea className="custom-class" />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toHaveClass("custom-class");
  });
});

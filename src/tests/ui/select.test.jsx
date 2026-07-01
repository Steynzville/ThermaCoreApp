import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@radix-ui/react-select", () => ({
  Root: ({ children, ...props }) => <div {...props}>{children}</div>,
  Group: ({ children, ...props }) => <div {...props}>{children}</div>,
  Value: ({ placeholder, ...props }) => <span {...props}>{placeholder}</span>,
  Trigger: ({ children, ...props }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Icon: ({ children }) => <>{children}</>,
  Portal: ({ children }) => <>{children}</>,
  Content: ({ children, ...props }) => <div {...props}>{children}</div>,
  Viewport: ({ children, ...props }) => <div {...props}>{children}</div>,
  Label: ({ children, ...props }) => <div {...props}>{children}</div>,
  Item: ({ children, ...props }) => (
    <div role="option" tabIndex={-1} {...props}>
      {children}
    </div>
  ),
  ItemIndicator: ({ children }) => <span>{children}</span>,
  ItemText: ({ children }) => <span>{children}</span>,
  Separator: (props) => <hr {...props} />,
  ScrollUpButton: ({ children, ...props }) => <div {...props}>{children}</div>,
  ScrollDownButton: ({ children, ...props }) => (
    <div {...props}>{children}</div>
  ),
}));

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

describe("Select Components", () => {
  it("renders Select with trigger", () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
      </Select>,
    );
    expect(
      container.querySelector('[data-slot="select-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders SelectGroup with items", () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="1">Item 1</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("renders SelectLabel in group", () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Label</SelectLabel>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("renders SelectSeparator with items", () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Item 1</SelectItem>
          <SelectSeparator />
          <SelectItem value="2">Item 2</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("renders complete select with items", () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Options</SelectLabel>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });
});

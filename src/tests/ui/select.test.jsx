import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
      </Select>
    );
    expect(container.querySelector('[data-slot="select-trigger"]')).toBeInTheDocument();
  });

  it("renders SelectGroup", () => {
    const { container } = render(
      <Select open>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="1">Item 1</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    expect(container.querySelector('[data-slot="select-group"]')).toBeInTheDocument();
  });

  it("renders SelectLabel", () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectLabel>Label</SelectLabel>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("renders SelectSeparator", () => {
    const { container } = render(
      <Select open>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectSeparator />
        </SelectContent>
      </Select>
    );
    expect(container.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
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
      </Select>
    );
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });
});

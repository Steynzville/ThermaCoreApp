import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

describe("Card Components", () => {
  it("renders Card container", () => {
    const { container } = render(<Card>Card content</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toBeInTheDocument();
  });

  it("renders CardHeader", () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.querySelector('[data-slot="card-header"]');
    expect(header).toBeInTheDocument();
  });

  it("renders CardTitle", () => {
    render(<CardTitle>Title Text</CardTitle>);
    expect(screen.getByText("Title Text")).toBeInTheDocument();
  });

  it("renders CardDescription", () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });

  it("renders CardAction", () => {
    const { container } = render(<CardAction>Action</CardAction>);
    const action = container.querySelector('[data-slot="card-action"]');
    expect(action).toBeInTheDocument();
  });

  it("renders CardContent", () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders CardFooter", () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.querySelector('[data-slot="card-footer"]');
    expect(footer).toBeInTheDocument();
  });

  it("renders complete card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Main content")).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });
});

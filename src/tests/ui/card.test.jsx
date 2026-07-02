import { render, screen } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
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
  afterEach(() => {
    // Clean up any DOM changes
    document.body.innerHTML = "";
  });

  it("renders Card container", () => {
    const { container } = render(<Card>Card content</Card>);
    // Check that the card rendered with content
    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders CardHeader", () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText("Header")).toBeInTheDocument();
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
    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("renders CardContent", () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders CardFooter", () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText("Footer")).toBeInTheDocument();
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

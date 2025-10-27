import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";

describe("Breadcrumb Components", () => {
  it("renders Breadcrumb navigation", () => {
    const { container } = render(<Breadcrumb />);
    const nav = container.querySelector('nav[aria-label="breadcrumb"]');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-slot", "breadcrumb");
  });

  it("renders BreadcrumbList as ordered list", () => {
    const { container } = render(<BreadcrumbList />);
    const list = container.querySelector("ol");
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("data-slot", "breadcrumb-list");
  });

  it("renders BreadcrumbItem", () => {
    const { container } = render(
      <BreadcrumbList>
        <BreadcrumbItem>Home</BreadcrumbItem>
      </BreadcrumbList>
    );
    const item = container.querySelector('[data-slot="breadcrumb-item"]');
    expect(item).toBeInTheDocument();
    expect(item.tagName).toBe("LI");
  });

  it("renders BreadcrumbLink with anchor", () => {
    const { container } = render(
      <BreadcrumbLink href="/home">Home</BreadcrumbLink>
    );
    const link = container.querySelector("a");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/home");
  });

  it("renders BreadcrumbPage with current page", () => {
    render(<BreadcrumbPage>Current Page</BreadcrumbPage>);
    const page = screen.getByRole("link", { name: "Current Page" });
    expect(page).toBeInTheDocument();
    expect(page).toHaveAttribute("aria-current", "page");
  });

  it("renders BreadcrumbSeparator with default icon", () => {
    const { container } = render(<BreadcrumbSeparator />);
    const separator = container.querySelector('[data-slot="breadcrumb-separator"]');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("role", "presentation");
  });

  it("renders BreadcrumbEllipsis", () => {
    render(<BreadcrumbEllipsis />);
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders complete breadcrumb navigation", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    expect(screen.getByRole("link", { name: "Current" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";

describe("Pagination Components", () => {
  it("renders Pagination navigation", () => {
    const { container } = render(<Pagination />);
    const nav = container.querySelector('nav[aria-label="pagination"]');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-slot", "pagination");
  });

  it("renders PaginationContent as list", () => {
    const { container } = render(<PaginationContent />);
    const list = container.querySelector("ul");
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("data-slot", "pagination-content");
  });

  it("renders PaginationItem", () => {
    const { container } = render(
      <PaginationContent>
        <PaginationItem>1</PaginationItem>
      </PaginationContent>
    );
    expect(container.querySelector('[data-slot="pagination-item"]')).toBeInTheDocument();
  });

  it("renders PaginationLink", () => {
    render(
      <PaginationContent>
        <PaginationItem>
          <PaginationLink href="/page/1">1</PaginationLink>
        </PaginationItem>
      </PaginationContent>
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders PaginationPrevious", () => {
    render(<PaginationPrevious href="/prev" />);
    expect(screen.getByLabelText("Go to previous page")).toBeInTheDocument();
  });

  it("renders PaginationNext", () => {
    render(<PaginationNext href="/next" />);
    expect(screen.getByLabelText("Go to next page")).toBeInTheDocument();
  });

  it("renders PaginationEllipsis", () => {
    render(<PaginationEllipsis />);
    expect(screen.getByText("More pages")).toBeInTheDocument();
  });

  it("renders complete pagination", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/prev" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    expect(screen.getByLabelText("Go to previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to next page")).toBeInTheDocument();
  });
});

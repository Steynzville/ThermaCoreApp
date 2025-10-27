import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

describe("Table Components", () => {
  it("renders Table container", () => {
    const { container } = render(<Table />);
    expect(container.querySelector('[data-slot="table"]')).toBeInTheDocument();
  });

  it("renders TableHeader", () => {
    const { container } = render(
      <Table>
        <TableHeader />
      </Table>
    );
    expect(container.querySelector('[data-slot="table-header"]')).toBeInTheDocument();
  });

  it("renders TableBody", () => {
    const { container } = render(
      <Table>
        <TableBody />
      </Table>
    );
    expect(container.querySelector('[data-slot="table-body"]')).toBeInTheDocument();
  });

  it("renders TableFooter", () => {
    const { container } = render(
      <Table>
        <TableFooter />
      </Table>
    );
    expect(container.querySelector('[data-slot="table-footer"]')).toBeInTheDocument();
  });

  it("renders TableRow", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow />
        </TableBody>
      </Table>
    );
    expect(container.querySelector('[data-slot="table-row"]')).toBeInTheDocument();
  });

  it("renders TableHead", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders TableCell", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("renders TableCaption", () => {
    render(
      <Table>
        <TableCaption>Table Caption</TableCaption>
      </Table>
    );
    expect(screen.getByText("Table Caption")).toBeInTheDocument();
  });

  it("renders complete table structure", () => {
    render(
      <Table>
        <TableCaption>Employee List</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>Developer</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    expect(screen.getByText("Employee List")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});

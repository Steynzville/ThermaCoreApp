/**
 * Tests for UI Components
 *
 * Simple smoke tests for basic UI components.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@radix-ui/react-accordion", () => ({
  Root: ({ children, ...props }) => <div {...props}>{children}</div>,
  Item: ({ children, ...props }) => <div {...props}>{children}</div>,
  Header: ({ children, ...props }) => <div {...props}>{children}</div>,
  Trigger: ({ children, ...props }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Content: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

describe("Table Component", () => {
  it("should render table structure", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(container).toBeTruthy();
  });
});

describe("Accordion Component", () => {
  it("should render accordion", () => {
    const { container } = render(
      <Accordion type="single">
        <AccordionItem value="item1">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Answer</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(container).toBeTruthy();
  });
});

describe("Avatar Component", () => {
  it("should render avatar with fallback", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/test.jpg" alt="Test" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(container).toBeTruthy();
  });
});

describe("Alert Component", () => {
  it("should render alert", () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert Description</AlertDescription>
      </Alert>,
    );
    expect(container).toBeTruthy();
  });
});

describe("Drawer Component", () => {
  it("should render drawer trigger", () => {
    const { container } = render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>Footer</DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );
    expect(container).toBeTruthy();
  });
});

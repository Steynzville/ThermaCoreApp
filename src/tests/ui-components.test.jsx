/**
 * Tests for UI Components
 *
 * Simple smoke tests for basic UI components.
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock window.Image for Avatar component
beforeEach(() => {
  // Mock window.Image for Avatar component - must include addEventListener
  window.Image = vi.fn().mockImplementation(() => ({
    src: '',
    onload: null,
    onerror: null,
    complete: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  
  // Mock window.addEventListener for Drawer component
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  
  // Mock ResizeObserver for Drawer component
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock getBoundingClientRect for any component that needs it
  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  });
  
  // Mock DOMRect for components that need it
  if (!window.DOMRect) {
    window.DOMRect = class DOMRect {
      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = y;
        this.left = x;
        this.bottom = y + height;
        this.right = x + width;
      }
      toJSON() {
        return {
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          top: this.top,
          left: this.left,
          bottom: this.bottom,
          right: this.right,
        };
      }
    };
  }
});

// Mock Radix UI Accordion
vi.mock("@radix-ui/react-accordion", () => ({
  Root: ({ children, type, ...props }) => (
    <div data-testid="accordion-root" data-type={type} {...props}>
      {children}
    </div>
  ),
  Item: ({ children, value, ...props }) => (
    <div data-testid="accordion-item" data-value={value} {...props}>
      {children}
    </div>
  ),
  Header: ({ children, ...props }) => (
    <div data-testid="accordion-header" {...props}>
      {children}
    </div>
  ),
  Trigger: ({ children, ...props }) => (
    <button data-testid="accordion-trigger" type="button" {...props}>
      {children}
    </button>
  ),
  Content: ({ children, ...props }) => (
    <div data-testid="accordion-content" {...props}>
      {children}
    </div>
  ),
}));

// Mock Radix UI Avatar
vi.mock("@radix-ui/react-avatar", () => ({
  Root: ({ children, ...props }) => (
    <div data-testid="avatar-root" {...props}>
      {children}
    </div>
  ),
  Image: ({ src, alt, ...props }) => (
    <img data-testid="avatar-image" src={src} alt={alt} {...props} />
  ),
  Fallback: ({ children, ...props }) => (
    <div data-testid="avatar-fallback" {...props}>
      {children}
    </div>
  ),
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Import components after mocks are set up
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
    // Verify table structure exists
    expect(container.querySelector('table')).toBeTruthy();
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
    // Verify accordion structure exists
    expect(container.querySelector('[data-testid="accordion-root"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="accordion-trigger"]')).toBeTruthy();
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
    // Verify avatar structure exists
    const avatarRoot = container.querySelector('[data-testid="avatar-root"]');
    expect(avatarRoot).toBeTruthy();
    
    const avatarImage = container.querySelector('[data-testid="avatar-image"]');
    expect(avatarImage).toBeTruthy();
    expect(avatarImage).toHaveAttribute('src', '/test.jpg');
    expect(avatarImage).toHaveAttribute('alt', 'Test');
    
    const avatarFallback = container.querySelector('[data-testid="avatar-fallback"]');
    expect(avatarFallback).toBeTruthy();
    expect(avatarFallback).toHaveTextContent('AB');
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
    // Verify alert content exists
    expect(container).toHaveTextContent('Alert Title');
    expect(container).toHaveTextContent('Alert Description');
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
    // Verify drawer trigger exists
    expect(container).toHaveTextContent('Open');
  });
});

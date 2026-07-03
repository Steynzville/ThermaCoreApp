import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

// Mock window.setTimeout and window.clearTimeout for AlertDialog
beforeEach(() => {
  window.setTimeout = vi.fn().mockImplementation((cb) => {
    cb();
    return 123;
  });
  window.clearTimeout = vi.fn();
});

describe("AlertDialog Components", () => {
  it("renders AlertDialogTrigger", () => {
    const { container } = render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
      </AlertDialog>,
    );
    expect(
      container.querySelector('[data-slot="alert-dialog-trigger"]'),
    ).toBeInTheDocument();
  });

  it("renders AlertDialogHeader", () => {
    const { container } = render(<AlertDialogHeader>Header</AlertDialogHeader>);
    expect(
      container.querySelector('[data-slot="alert-dialog-header"]'),
    ).toBeInTheDocument();
  });

  it("renders AlertDialogFooter", () => {
    const { container } = render(<AlertDialogFooter>Footer</AlertDialogFooter>);
    expect(
      container.querySelector('[data-slot="alert-dialog-footer"]'),
    ).toBeInTheDocument();
  });

  it("renders complete alert dialog structure", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    
    const titleElements = screen.getAllByText("Are you sure?");
    expect(titleElements.length).toBeGreaterThan(0);
    
    const descElements = screen.getAllByText("This action cannot be undone.");
    expect(descElements.length).toBeGreaterThan(0);
    
    const cancelElements = screen.getAllByText("Cancel");
    expect(cancelElements.length).toBeGreaterThan(0);
    
    const continueElements = screen.getAllByText("Continue");
    expect(continueElements.length).toBeGreaterThan(0);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });
});

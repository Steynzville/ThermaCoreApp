/**
 * Form component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *   + react-hook-form (real, not mocked — it works fine under jsdom)
 *
 * These tests build a small real form using useForm() to exercise the
 * Form/FormField/FormItem/FormLabel/FormControl/FormDescription/FormMessage
 * wiring the way a consuming component actually would.
 */
import { describe, it, expect, vi } from "vitest";
import { useForm } from "react-hook-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";

function SetpointForm({ onSubmit = () => {}, defaultValues } = {}) {
  const form = useForm({
    defaultValues: { setpoint: "", ...defaultValues },
    mode: "onSubmit",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField
          control={form.control}
          name="setpoint"
          rules={{
            required: "Setpoint is required",
            max: { value: 100, message: "Setpoint cannot exceed 100 PSI" },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pressure Setpoint</FormLabel>
              <FormControl>
                <input {...field} type="number" />
              </FormControl>
              <FormDescription>Enter a value between 0 and 100 PSI.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe("Form", () => {
  it("renders the label, input, and description", () => {
    render(<SetpointForm />);
    expect(screen.getByText("Pressure Setpoint")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a value between 0 and 100 PSI."),
    ).toBeInTheDocument();
  });

  it("associates the label with the input via matching id/htmlFor", () => {
    render(<SetpointForm />);
    const input = screen.getByLabelText("Pressure Setpoint");
    expect(input).toBeInTheDocument();
  });

  it("wires aria-describedby to the description only when there is no error", () => {
    render(<SetpointForm />);
    const input = screen.getByRole("spinbutton");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    // Should reference only the description id (no message id) pre-validation.
    expect(describedBy.split(" ")).toHaveLength(1);
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("does not render a FormMessage when there is no error and no children", () => {
    // FormMessage returns null when there's no error and no explicit children.
    const { container } = render(<SetpointForm />);
    expect(
      container.querySelector('[data-slot="form-message"]'),
    ).not.toBeInTheDocument();
  });

  it("shows a validation error message after submitting an empty required field", async () => {
    const user = userEvent.setup();
    const onSubmit = () => {};
    render(<SetpointForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Setpoint is required")).toBeInTheDocument();
  });

  it("marks the label and input as errored (data-error / aria-invalid) after a failed validation", async () => {
    const user = userEvent.setup();
    render(<SetpointForm />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Setpoint is required");

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const label = screen.getByText("Pressure Setpoint");
    expect(label).toHaveAttribute("data-error", "true");
  });

  it("includes both description and message ids in aria-describedby once an error exists", async () => {
    const user = userEvent.setup();
    render(<SetpointForm />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Setpoint is required");

    const input = screen.getByRole("spinbutton");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy.split(" ")).toHaveLength(2);
  });

  it("clears the error message once the field is corrected and resubmitted", async () => {
    const user = userEvent.setup();
    render(<SetpointForm />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Setpoint is required");

    await user.type(screen.getByRole("spinbutton"), "42");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByText("Setpoint is required")).not.toBeInTheDocument();
  });

  it("calls onSubmit with the field values when validation passes", async () => {
    let submitted = null;
    const user = userEvent.setup();
    render(<SetpointForm onSubmit={(values) => (submitted = values)} />);

    await user.type(screen.getByRole("spinbutton"), "55");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(submitted).toEqual({ setpoint: "55" });
  });

  it("shows a max-value validation message when the rule is violated", async () => {
    const user = userEvent.setup();
    render(<SetpointForm />);

    await user.type(screen.getByRole("spinbutton"), "150");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Setpoint cannot exceed 100 PSI"),
    ).toBeInTheDocument();
  });

  it("throws when useFormField is used outside of a FormField/FormItem context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function BrokenConsumer() {
      useFormField();
      return null;
    }
    expect(() => render(<BrokenConsumer />)).toThrow();
    spy.mockRestore();
  });
});

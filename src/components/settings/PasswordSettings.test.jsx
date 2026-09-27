import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
const save = vi.hoisted(() => vi.fn());
vi.mock("../../utils/apiFetch", () => ({ apiPostJson: save }));
import PasswordSettings from "./PasswordSettings";
describe("own account password changes", () => {
  it("requires current password, checks confirmation and calls the own-account endpoint", async () => {
    save.mockResolvedValue({ success: true });
    render(<PasswordSettings />);
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-long-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "matching confirmation",
    );
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-long-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await screen.findByText("Password changed.");
    expect(save).toHaveBeenCalledWith(
      "/api/v1/auth/change-password",
      { current_password: "old-password", new_password: "new-long-password" },
      { redirectOn401: false },
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import ConnectedAccounts from "./ConnectedAccounts";
import { apiGetJson, apiFetch } from "../../utils/apiFetch";
import { startProviderSignIn } from "../../services/externalAuthService";
import { registerPasskey } from "../../services/passkeyService";
vi.mock("../../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
  apiFetch: vi.fn(),
}));
vi.mock("../../services/externalAuthService", () => ({
  startProviderSignIn: vi.fn(),
}));
vi.mock("../../services/passkeyService", () => ({ registerPasskey: vi.fn() }));
beforeEach(() =>
  apiGetJson.mockImplementation(async (path) =>
    path.endsWith("identities")
      ? { providers: ["google"] }
      : { data: [{ id: "key/1", name: "Existing key" }] },
  ),
);
it.each(["Apple", "Google"])(
  "requires the current password and invokes the real %s linking contract",
  async (provider) => {
    const user = userEvent.setup();
    render(<ConnectedAccounts />);
    expect(await screen.findByText("Connected: google")).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: provider === "Google" ? "Link another Google" : "Link Apple",
    });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText("Current password"), "password");
    startProviderSignIn.mockRejectedValueOnce(
      new Error(`${provider} is not configured`),
    );
    await user.click(button);
    expect(startProviderSignIn).toHaveBeenCalledWith(
      provider.toLowerCase(),
      true,
      "password",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "not configured",
    );
    expect(button).toBeEnabled();
  },
);
it("persists passkey registration/removal via services and refreshes the stored key list", async () => {
  const user = userEvent.setup();
  render(<ConnectedAccounts />);
  expect(await screen.findByText("Existing key")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Register passkey" }),
  ).toBeDisabled();
  await user.type(screen.getByLabelText("Current password"), "password");
  await user.clear(screen.getByLabelText("Passkey name"));
  await user.type(screen.getByLabelText("Passkey name"), "Laptop");
  registerPasskey.mockResolvedValue({ id: "new" });
  apiGetJson.mockResolvedValue({ data: [{ id: "new", name: "Laptop" }] });
  await user.click(screen.getByRole("button", { name: "Register passkey" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Passkey registered.",
  );
  expect(registerPasskey).toHaveBeenCalledWith("password", "Laptop");
  expect(screen.queryByText("Existing key")).not.toBeInTheDocument();
  apiFetch.mockResolvedValue({});
  apiGetJson.mockResolvedValue({ data: [] });
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Passkey removed.",
  );
  expect(apiFetch).toHaveBeenCalledWith("/api/v1/auth/passkeys/new", {
    method: "DELETE",
    body: JSON.stringify({ password: "password" }),
  });
  expect(
    screen.queryByRole("button", { name: "Remove" }),
  ).not.toBeInTheDocument();
});
it("keeps failed passkey operations retryable and never displays success", async () => {
  const user = userEvent.setup();
  render(<ConnectedAccounts />);
  await screen.findByText("Existing key");
  await user.type(screen.getByLabelText("Current password"), "password");
  registerPasskey.mockRejectedValue(new Error("Device cancelled"));
  await user.click(screen.getByRole("button", { name: "Register passkey" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Device cancelled",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  apiFetch.mockRejectedValue(new Error("Wrong current password"));
  await user.click(screen.getByRole("button", { name: "Remove" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Wrong current password",
    ),
  );
  expect(screen.getByText("Existing key")).toBeInTheDocument();
});
it("shows backend loading errors for identities and passkeys", async () => {
  apiGetJson.mockRejectedValue(new Error("Account service offline"));
  render(<ConnectedAccounts />);
  expect(await screen.findAllByRole("alert")).toHaveLength(2);
  expect(screen.queryByText(/Connected:/)).not.toBeInTheDocument();
});

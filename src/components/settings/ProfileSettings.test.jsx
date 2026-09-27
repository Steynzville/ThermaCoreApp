import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  fetch: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../../utils/apiFetch", () => ({
  apiGetJson: mocks.get,
  apiPutJson: mocks.put,
  apiFetch: mocks.fetch,
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ updateAccountProfile: mocks.update }),
}));
import ProfileSettings from "./ProfileSettings";
const profile = {
  username: "viewer",
  firstName: "Alex",
  lastName: "Smith",
  displayName: "Alex",
  email: "alex@example.test",
  avatarDataUrl: null,
};
describe("account profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ profile });
  });
  it("loads the actual profile and persists edits without sending authorization fields", async () => {
    mocks.put.mockResolvedValue({
      profile: { ...profile, displayName: "Operations" },
    });
    render(<ProfileSettings />);
    await screen.findByDisplayValue("viewer");
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Operations" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved.");
    expect(mocks.put).toHaveBeenCalledWith("/api/v1/account/settings", {
      profile: {
        username: "viewer",
        firstName: "Alex",
        lastName: "Smith",
        displayName: "Operations",
      },
    });
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(mocks.update).toHaveBeenCalledWith({
      ...profile,
      displayName: "Operations",
    });
  });
  it("surfaces username validation errors without reporting success", async () => {
    mocks.put.mockRejectedValue(new Error("Username is already in use"));
    render(<ProfileSettings />);
    await screen.findByDisplayValue("viewer");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Username is already in use",
    );
    expect(screen.queryByText("Profile saved.")).not.toBeInTheDocument();
  });
  it("uploads the selected file as multipart data and displays the server-normalized avatar", async () => {
    mocks.fetch.mockResolvedValue({
      json: async () => ({
        profile: {
          ...profile,
          avatarDataUrl: "data:image/png;base64,aW1hZ2U=",
        },
      }),
    });
    render(<ProfileSettings />);
    await screen.findByDisplayValue("viewer");
    const file = new File(["pixels"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Profile picture/), {
      target: { files: [file] },
    });
    await screen.findByAltText("Your profile");
    expect(mocks.fetch.mock.calls[0][1].body.get("avatar")).toBe(file);
  });
});

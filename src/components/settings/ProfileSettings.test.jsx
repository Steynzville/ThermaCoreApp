import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ProfileSettings from "./ProfileSettings";

// Mock the AuthContext
const mockUpdateProfile = vi.fn();
const mockUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@thermacore.com",
  role: "admin",
};

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile,
    isLoading: false,
  }),
}));

// Mock the SettingsContext
const mockHandleSettingChange = vi.fn();

describe("ProfileSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render profile settings card with form fields", () => {
    render(<ProfileSettings />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();

    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("john@thermacore.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
  });

  it("should display loading state when isLoading is true", () => {
    // Override the mock for this test
    vi.mocked(vi.fn).mockImplementationOnce(() => ({
      useAuth: () => ({
        user: mockUser,
        updateProfile: mockUpdateProfile,
        isLoading: true,
      }),
    }));

    render(<ProfileSettings />);
    
    // Should show loading indicator
    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
    // Form fields should be disabled
    expect(screen.getByLabelText("Full Name")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });

  it("should handle name change input", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    const nameInput = screen.getByLabelText("Full Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");

    expect(nameInput).toHaveValue("Jane Smith");
  });

  it("should handle email change input", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    const emailInput = screen.getByLabelText("Email");
    await user.clear(emailInput);
    await user.type(emailInput, "jane@thermacore.com");

    expect(emailInput).toHaveValue("jane@thermacore.com");
  });

  it("should save profile changes when save button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    const nameInput = screen.getByLabelText("Full Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: "Jane Smith",
        email: "john@thermacore.com",
      });
    });
  });

  it("should show success message after successful save", async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValueOnce({ success: true });
    
    render(<ProfileSettings />);

    const nameInput = screen.getByLabelText("Full Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
    });
  });

  it("should show error message when save fails", async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockRejectedValueOnce(new Error("Network error"));
    
    render(<ProfileSettings />);

    const nameInput = screen.getByLabelText("Full Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to update profile. Please try again.")).toBeInTheDocument();
    });
  });

  it("should disable save button when form is loading", () => {
    // Override mock for this test
    vi.mocked(vi.fn).mockImplementationOnce(() => ({
      useAuth: () => ({
        user: mockUser,
        updateProfile: mockUpdateProfile,
        isLoading: true,
      }),
    }));

    render(<ProfileSettings />);
    
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent("Saving...");
  });

  it("should not update if no changes were made", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    await user.click(saveButton);

    // Should show a message that no changes were made
    await waitFor(() => {
      expect(screen.getByText("No changes to save")).toBeInTheDocument();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("should render with proper field labels and placeholders", () => {
    render(<ProfileSettings />);

    expect(screen.getByLabelText("Full Name")).toHaveAttribute("placeholder", "Enter your full name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("placeholder", "Enter your email address");
    expect(screen.getByLabelText("Role")).toHaveAttribute("disabled");
  });

  it("should handle cancel button click", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    // First make a change
    const nameInput = screen.getByLabelText("Full Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    // Should revert to original value
    expect(nameInput).toHaveValue("John Doe");
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

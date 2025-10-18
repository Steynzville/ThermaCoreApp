import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import UserRegistrationForm from "../components/UserRegistrationForm";
import * as authService from "../services/authService";

// Mock the authService
vi.mock("../services/authService", () => ({
  register: vi.fn(),
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("UserRegistrationForm", () => {
  const renderForm = () => {
    return render(
      <BrowserRouter>
        <UserRegistrationForm />
      </BrowserRouter>,
    );
  };

  it("renders all 9 form fields", () => {
    renderForm();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
  });

  it("renders submit and cancel buttons", () => {
    renderForm();

    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    renderForm();

    const submitButton = screen.getByText("Create Account");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });
  });

  it("submits form with valid data", async () => {
    const mockRegister = vi.mocked(authService.register);
    mockRegister.mockResolvedValueOnce({ success: true });

    renderForm();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: "Doe" },
    });

    const submitButton = screen.getByText("Create Account");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "testuser",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
        }),
      );
    });
  });

  it("has minimum 44px touch targets on mobile", () => {
    renderForm();

    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      const styles = window.getComputedStyle(input);
      const minHeight = parseInt(styles.minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});

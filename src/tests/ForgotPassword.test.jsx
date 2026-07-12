// src/tests/ForgotPassword.test.jsx
import { render, screen, waitFor, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import ForgotPassword from "../components/ForgotPassword";
import * as authService from "../services/authService";

// ============================================================
// CRITICAL FIX: Ensure real timers for React's scheduler
// ============================================================
vi.useRealTimers();

// Helper to flush pending promises
const flushPromises = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

// ============================================================
// Mock the auth service
// ============================================================
vi.mock("../services/authService", () => ({
  requestPasswordReset: vi.fn(),
}));

// ============================================================
// Mock react-router-dom with hoisted navigate
// ============================================================
const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ============================================================
// Mock the logo import
// ============================================================
vi.mock("../assets/thermacore-logo-new.png", () => ({
  default: "test-logo.png",
}));

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Don't cleanup immediately - let the test finish first
    // The test's waitFor will complete before this runs
    vi.clearAllMocks();
    vi.useRealTimers();
    cleanup();
  });

  const renderForgotPassword = () => {
    return render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  const submitForm = () => {
    const form = document.querySelector('form[novalidate]');
    if (!form) throw new Error('Form not found');
    fireEvent.submit(form);
  };

  it("renders the forgot password page correctly", () => {
    renderForgotPassword();

    expect(screen.getByText("Forgot Password?")).toBeInTheDocument();
    expect(
      screen.getByText("Enter your email to receive a password reset link")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Reset Link" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to Login" })
    ).toBeInTheDocument();
    expect(screen.getByAltText("ThermaCore Logo")).toBeInTheDocument();
  });

  it("shows error when submitting with empty email", async () => {
    renderForgotPassword();

    submitForm();

    const errorElement = await screen.findByText("Please enter your email address");
    expect(errorElement).toBeInTheDocument();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("shows error when submitting with invalid email format", async () => {
    const user = userEvent.setup();
    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "invalid-email");

    submitForm();

    const errorElement = await screen.findByText("Please enter a valid email address");
    expect(errorElement).toBeInTheDocument();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("submits valid email and shows success message", async () => {
    const user = userEvent.setup();
    const successMessage = "Password reset link sent to your email";
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      success: true,
      message: successMessage,
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");

    submitForm();

    // Flush promises to allow the async handler to complete
    await flushPromises();

    await waitFor(() => {
      expect(authService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
    }, { timeout: 3000 });

    const successElement = await screen.findByText(successMessage, {}, { timeout: 3000 });
    expect(successElement).toBeInTheDocument();
  });

  it("shows error message when request fails", async () => {
    const user = userEvent.setup();
    const errorMessage = "Email not found";
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      success: false,
      message: errorMessage,
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");

    submitForm();

    await flushPromises();

    await waitFor(() => {
      expect(authService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
    }, { timeout: 3000 });

    const errorElement = await screen.findByText(errorMessage, {}, { timeout: 3000 });
    expect(errorElement).toBeInTheDocument();
  });

  it("shows error when request throws exception", async () => {
    const user = userEvent.setup();
    vi.mocked(authService.requestPasswordReset).mockRejectedValue(
      new Error("Network error")
    );

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");

    submitForm();

    const errorElement = await screen.findByText(
      "An unexpected error occurred. Please try again."
    );
    expect(errorElement).toBeInTheDocument();
  });

  it("clears previous error when submitting new request", async () => {
    const user = userEvent.setup();
    const errorMessage = "Email not found";
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      success: false,
      message: errorMessage,
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");

    submitForm();

    const errorElement = await screen.findByText(errorMessage);
    expect(errorElement).toBeInTheDocument();

    // Submit again with valid response
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      success: true,
      message: "Success!",
    });

    submitForm();
    await flushPromises();

    const successElement = await screen.findByText("Success!");
    expect(successElement).toBeInTheDocument();
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  it("disables inputs and button during submission", async () => {
    const user = userEvent.setup();
    vi.mocked(authService.requestPasswordReset).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, message: "OK" }), 300))
    );

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");

    submitForm();

    // Wait for the button text to change to "Sending..."
    const sendingButton = await screen.findByRole("button", { name: "Sending..." }, { timeout: 3000 });
    expect(sendingButton).toBeInTheDocument();
    expect(sendingButton).toBeDisabled();
    expect(emailInput).toBeDisabled();

    // Wait for the submission to complete
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send Reset Link" })).toBeInTheDocument();
      expect(emailInput).not.toBeDisabled();
    }, { timeout: 4000 });
  });

  it("navigates back to login when Back to Login button is clicked", async () => {
    const user = userEvent.setup();
    renderForgotPassword();

    const backButton = screen.getByRole("button", { name: "Back to Login" });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("clears email field after successful submission", async () => {
    const user = userEvent.setup();
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      success: true,
      message: "Reset link sent",
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");

    submitForm();
    await flushPromises();

    await waitFor(() => {
      expect(emailInput).toHaveValue("");
    }, { timeout: 3000 });
  });

  it("handles trimming of email input", async () => {
    const user = userEvent.setup();
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      success: true,
      message: "Reset link sent",
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "  test@example.com  ");

    submitForm();
    await flushPromises();

    await waitFor(() => {
      expect(authService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
    }, { timeout: 3000 });
  });

  it("handles service returning error message without success flag", async () => {
    const user = userEvent.setup();
    const errorMessage = "Something went wrong";
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      message: errorMessage,
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "test@example.com");

    submitForm();

    const errorElement = await screen.findByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  });
});

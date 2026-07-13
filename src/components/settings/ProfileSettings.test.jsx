import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import ProfileSettings from "./ProfileSettings";

describe("ProfileSettings", () => {
  it("should render profile settings card with form fields", () => {
    render(<ProfileSettings />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();

    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("john@thermacore.com")).toBeInTheDocument();
  });

  it("should render the User icon", () => {
    render(<ProfileSettings />);
    
    // Check that the User icon is present (using SVG selector or testid)
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-5", "w-5", "text-blue-600");
  });

  it("should render FormFieldGroup components with correct props", () => {
    render(<ProfileSettings />);
    
    // Full Name field
    const nameInput = screen.getByLabelText("Full Name");
    expect(nameInput).toHaveAttribute("type", "text");
    expect(nameInput).toHaveValue("John Doe");
    
    // Email field
    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveValue("john@thermacore.com");
  });

  it("should render with correct dark mode classes", () => {
    render(<ProfileSettings />);
    
    const card = document.querySelector(".bg-white.dark\\:bg-gray-900");
    expect(card).toBeInTheDocument();
    
    const header = document.querySelector(".text-gray-900.dark\\:text-gray-100");
    expect(header).toBeInTheDocument();
  });

  it("should render both fields with proper IDs", () => {
    render(<ProfileSettings />);
    
    const nameInput = screen.getByLabelText("Full Name");
    expect(nameInput).toHaveAttribute("id", "fullName");
    
    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toHaveAttribute("id", "email");
  });

  it("should not have any interactive buttons", () => {
    render(<ProfileSettings />);
    
    // No save/cancel buttons should exist
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should render with correct card structure", () => {
    render(<ProfileSettings />);
    
    // Card should have header and content
    const card = document.querySelector(".bg-white.dark\\:bg-gray-900");
    expect(card).toBeInTheDocument();
    
    const header = screen.getByRole("heading", { name: "Profile" });
    expect(header).toBeInTheDocument();
    
    const fields = screen.getAllByRole("textbox");
    expect(fields).toHaveLength(2);
  });
});

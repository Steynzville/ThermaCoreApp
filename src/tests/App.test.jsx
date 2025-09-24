import React from "react";
import { render, screen } from "@testing-library/react";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

describe("App", () => {
  it("renders Login page for unauthenticated user", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>,
    );
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
  });
});

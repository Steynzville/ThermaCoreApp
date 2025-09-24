import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SidebarProvider } from "../context/SidebarContext";

describe("ProtectedRoute", () => {
  it("redirects unauthenticated user to login page", () => {
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route
                  path="/protected"
                  element={
                    <ProtectedRoute>
                      <p>Protected Content</p>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";


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

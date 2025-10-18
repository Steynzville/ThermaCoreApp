import { render, screen } from "@testing-library/react";


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

// ============================================================
// TEST: Error State - FIXED
// ============================================================
it("should show error state when API fails", async () => {
  apiGetJson.mockRejectedValue(new Error("Network error"));

  render(
    <TestWrapper>
      <MultiProtocolManager />
    </TestWrapper>,
  );

  // Wait for the component to finish loading and show error state
  await waitFor(() => {
    // The component should show the error state with "Failed to Load"
    const errorHeading = screen.queryByText("Failed to Load");
    const tryAgainButton = screen.queryByText("Try Again");
    const errorMessage = screen.queryByText(/could not retrieve protocol status/i);
    
    // At least one of these should be present
    expect(errorHeading || tryAgainButton || errorMessage).toBeTruthy();
  }, { timeout: 3000 });
});

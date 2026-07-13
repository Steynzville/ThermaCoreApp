it("should handle publish message", async () => {
  const user = userEvent.setup();
  render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

  const tabs = screen.getAllByTestId("tabs-trigger");
  const publishTab = tabs.find(tab => tab.textContent.includes("Publish"));
  await user.click(publishTab);

  const inputs = screen.getAllByTestId("input");
  const topicInput = inputs.find(input => input.id === "pub-topic");
  await user.type(topicInput, "sensors/test");

  const textareas = screen.getAllByTestId("textarea");
  const payloadTextarea = textareas.find(textarea => textarea.id === "pub-payload");
  // Use fireEvent.change instead of userEvent.type to avoid curly brace escaping
  fireEvent.change(payloadTextarea, { target: { value: '{"test": "value"}' } });

  const buttons = screen.getAllByTestId("button");
  const publishButton = buttons.find(btn => btn.textContent.includes("Publish Message"));
  await user.click(publishButton);

  await waitFor(() => {
    expect(apiPostJson).toHaveBeenCalledWith(
      `/api/v1/protocols/mqtt/publish?tenant_id=${mockTenantId}`,
      expect.objectContaining({
        topic: "sensors/test",
        payload: '{"test": "value"}',
        qos: 0,
        retain: false,
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Message published successfully");
  });
});

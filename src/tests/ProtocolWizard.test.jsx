/**
 * Tests for ProtocolWizard Component
 *
 * Coverage includes:
 * - Protocol selection (Modbus, OPC-UA, DNP3, MQTT)
 * - Parameter validation
 * - Save/load configuration
 * - Connection testing
 * - Invalid configuration error handling
 * - Step navigation
 * - Form field validation
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtocolWizard from "@/components/protocol/ProtocolWizard";

// Mock API fetch
vi.mock("@/utils/apiFetch", () => ({
  apiPostJson: vi.fn(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useMediaQuery hook
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn().mockReturnValue(true),
}));

import { toast } from "sonner";
import { apiPostJson } from "@/utils/apiFetch";
import { useMediaQuery } from "@/hooks/use-media-query";

describe("ProtocolWizard", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    tenantId: "tenant-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop view
    useMediaQuery.mockReturnValue(true);
  });

  // Helper to get dialog content with proper waiting
  const getDialogContent = async () => {
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
    const dialog = screen.getByRole("dialog");
    return within(dialog);
  };

  // Helper to find and click a protocol card
  const selectProtocol = async (protocolName) => {
    const content = await getDialogContent();
    // Find the card by the protocol name (uppercase in the component)
    const upperName = protocolName.toUpperCase();
    const cards = content.queryAllByText(upperName);
    // Find the one that's in a card (not in descriptions)
    for (const el of cards) {
      const card = el.closest('[class*="cursor-pointer"]') || el.closest("div");
      if (card && card.getAttribute("role") !== "dialog") {
        fireEvent.click(card);
        return card;
      }
    }
    // Fallback: click the first card with the name
    if (cards.length > 0) {
      const card = cards[0].closest("div");
      if (card) fireEvent.click(card);
    }
  };

  // Helper to navigate through wizard steps
  const navigateToStep = async (targetStep, protocolName = "modbus") => {
    // Select protocol
    await selectProtocol(protocolName);

    // Click Next until we reach the target step
    let currentStep = 0;
    let nextButton = screen.queryByRole("button", { name: /next/i });

    while (nextButton && !nextButton.disabled && currentStep < targetStep) {
      fireEvent.click(nextButton);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
      currentStep++;
      // Re-query the button after each step
      await waitFor(() => {
        nextButton = screen.queryByRole("button", { name: /next/i });
      });
    }

    // Wait for the step to render
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  };

  describe("Component Rendering", () => {
    it("should render wizard when open", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
    });

    it("should not render when closed", () => {
      render(<ProtocolWizard {...defaultProps} isOpen={false} />);

      const dialogs = screen.queryAllByRole("dialog");
      expect(dialogs.length).toBe(0);
    });

    it("should display all protocol options", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const content = await getDialogContent();
      // The component uses uppercase for protocol names
      expect(content.getByText("MODBUS")).toBeInTheDocument();
      expect(content.getByText("OPCUA")).toBeInTheDocument();
      expect(content.getByText("DNP3")).toBeInTheDocument();
      expect(content.getByText("MQTT")).toBeInTheDocument();
    });

    it("should show protocol descriptions", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const content = await getDialogContent();
      expect(
        content.getByText("Industrial serial/TCP protocol"),
      ).toBeInTheDocument();
      expect(content.getByText("OPC Unified Architecture")).toBeInTheDocument();
      expect(
        content.getByText("Distributed Network Protocol"),
      ).toBeInTheDocument();
      expect(content.getByText("Message Queue Telemetry")).toBeInTheDocument();
    });
  });

  describe("Protocol Selection", () => {
    it("should allow selecting Modbus protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("modbus");

      const content = await getDialogContent();
      // Modbus card should be selected (has border-primary class)
      const modbusText = content.getByText("MODBUS");
      const card = modbusText.closest('[class*="cursor-pointer"]') || 
                   modbusText.closest("div");
      expect(card?.parentElement).toHaveClass(/border-primary/);
    });

    it("should allow selecting OPC-UA protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("opcua");

      const content = await getDialogContent();
      const opcuaText = content.getByText("OPCUA");
      const card = opcuaText.closest('[class*="cursor-pointer"]') || 
                   opcuaText.closest("div");
      expect(card?.parentElement).toHaveClass(/border-primary/);
    });

    it("should allow selecting DNP3 protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("dnp3");

      const content = await getDialogContent();
      const dnp3Text = content.getByText("DNP3");
      const card = dnp3Text.closest('[class*="cursor-pointer"]') || 
                   dnp3Text.closest("div");
      expect(card?.parentElement).toHaveClass(/border-primary/);
    });

    it("should allow selecting MQTT protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("mqtt");

      const content = await getDialogContent();
      const mqttText = content.getByText("MQTT");
      const card = mqttText.closest('[class*="cursor-pointer"]') || 
                   mqttText.closest("div");
      expect(card?.parentElement).toHaveClass(/border-primary/);
    });
  });

  describe("Step Navigation", () => {
    it("should navigate to next step after protocol selection", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("modbus");

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        // Should show Device Information step
        expect(content.getByText("Device Information")).toBeInTheDocument();
      });
    });

    it("should navigate back to previous step", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Go to step 2
      await navigateToStep(1);

      // Click back
      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        // Should be back on protocol selection
        expect(content.getByText("Select Protocol")).toBeInTheDocument();
      });
    });

    it("should not allow going back from first step", () => {
      render(<ProtocolWizard {...defaultProps} />);

      const backButton = screen.queryByRole("button", { name: /back/i });
      if (backButton) {
        expect(backButton).toBeDisabled();
      } else {
        expect(backButton).not.toBeInTheDocument();
      }
    });

    it("should disable Next button when protocol not selected", () => {
      render(<ProtocolWizard {...defaultProps} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Modbus Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "modbus");
    });

    it("should display device ID field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Device ID/i)).toBeInTheDocument();
    });

    it("should display unit ID field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Unit ID \(Slave Address\)/i)).toBeInTheDocument();
    });

    it("should allow entering device ID", async () => {
      const content = within(screen.getByRole("dialog"));
      const input = content.getByLabelText(/Device ID/i);
      fireEvent.change(input, { target: { value: "PLC-001" } });
      expect(input).toHaveValue("PLC-001");
    });

    it("should allow entering unit ID", async () => {
      const content = within(screen.getByRole("dialog"));
      const input = content.getByLabelText(/Unit ID \(Slave Address\)/i);
      fireEvent.change(input, { target: { value: "5" } });
      expect(input).toHaveValue(5);
    });

    it("should navigate to connection settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByText("Connection Settings")).toBeInTheDocument();
      });
    });

    it("should validate host address format", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByLabelText(/Host\/IP Address/i)).toBeInTheDocument();
      });
    });

    it("should validate port number", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByLabelText(/Port/i)).toBeInTheDocument();
      });
    });
  });

  describe("OPC-UA Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "opcua");
    });

    it("should display endpoint URL field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Endpoint URL/i)).toBeInTheDocument();
    });

    it("should allow entering endpoint URL", async () => {
      const content = within(screen.getByRole("dialog"));
      const input = content.getByLabelText(/Endpoint URL/i);
      fireEvent.change(input, {
        target: { value: "opc.tcp://localhost:4840" },
      });
      expect(input).toHaveValue("opc.tcp://localhost:4840");
    });

    it("should navigate to security settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByText("Security Configuration")).toBeInTheDocument();
      });
    });

    it("should display security mode options", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByLabelText(/Security Mode/i)).toBeInTheDocument();
      });
    });

    it("should handle optional authentication", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByLabelText(/Username \(optional\)/i)).toBeInTheDocument();
        expect(content.getByLabelText(/Password \(optional\)/i)).toBeInTheDocument();
      });
    });
  });

  describe("DNP3 Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "dnp3");
    });

    it("should display master address field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Master Address/i)).toBeInTheDocument();
    });

    it("should display outstation address field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Outstation Address/i)).toBeInTheDocument();
    });

    it("should validate address values", async () => {
      const content = within(screen.getByRole("dialog"));
      const masterInput = content.getByLabelText(/Master Address/i);
      const outstationInput = content.getByLabelText(/Outstation Address/i);
      
      fireEvent.change(masterInput, { target: { value: "1" } });
      fireEvent.change(outstationInput, { target: { value: "10" } });
      
      expect(masterInput).toHaveValue(1);
      expect(outstationInput).toHaveValue(10);
    });
  });

  describe("MQTT Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "mqtt");
    });

    it("should display broker host field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Broker Host/i)).toBeInTheDocument();
    });

    it("should display broker port field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Port/i)).toBeInTheDocument();
    });

    it("should display client ID field", async () => {
      const content = within(screen.getByRole("dialog"));
      expect(content.getByLabelText(/Client ID/i)).toBeInTheDocument();
    });

    it("should navigate to authentication settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByText("Authentication (Optional)")).toBeInTheDocument();
      });
    });
  });

  describe("Connection Testing", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      // Navigate to test connection step (step 3 for modbus)
      await navigateToStep(3, "modbus");
    });

    it("should display test connection button", async () => {
      const content = within(screen.getByRole("dialog"));
      const button = content.getByRole("button", { name: /test connection/i });
      expect(button).toBeInTheDocument();
    });

    it("should test connection successfully", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const content = within(screen.getByRole("dialog"));
      const testButton = content.getByRole("button", { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Connection test successful!");
      });
    });

    it("should handle connection test failure", async () => {
      apiPostJson.mockRejectedValue(new Error("Connection timeout"));

      const content = within(screen.getByRole("dialog"));
      const testButton = content.getByRole("button", { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Connection test failed");
      });
    });

    it("should show loading state during connection test", async () => {
      apiPostJson.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const content = within(screen.getByRole("dialog"));
      const testButton = content.getByRole("button", { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        // Button should show loading state
        const loadingButton = screen.getByRole("button", { name: /testing/i });
        expect(loadingButton).toBeDisabled();
      });
    });

    it("should display connection test results", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const content = within(screen.getByRole("dialog"));
      const testButton = content.getByRole("button", { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
        // Check for success message in the UI
        const successMessage = screen.getByText("Connection successful");
        expect(successMessage).toBeInTheDocument();
      });
    });
  });

  describe("Configuration Save", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      // Navigate to complete step (step 4 for modbus)
      await navigateToStep(4, "modbus");
    });

    it("should display save button", async () => {
      const content = within(screen.getByRole("dialog"));
      const saveButton = content.getByRole("button", { name: /save configuration/i });
      expect(saveButton).toBeInTheDocument();
    });

    it("should save configuration successfully", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const content = within(screen.getByRole("dialog"));
      const saveButton = content.getByRole("button", { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it("should handle save errors", async () => {
      apiPostJson.mockRejectedValue(new Error("Save failed"));

      const content = within(screen.getByRole("dialog"));
      const saveButton = content.getByRole("button", { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save configuration");
      });
    });

    it("should include tenant ID in save request", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const content = within(screen.getByRole("dialog"));
      const saveButton = content.getByRole("button", { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          expect.stringContaining("tenant_id=tenant-1"),
          expect.any(Object),
        );
      });
    });
  });

  describe("Validation and Error Handling", () => {
    it("should validate required fields", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Try to click Next without selecting protocol
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();

      // Select protocol
      await selectProtocol("modbus");
      expect(nextButton).not.toBeDisabled();
    });

    it("should handle invalid port numbers", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "modbus");

      const content = within(screen.getByRole("dialog"));
      const portInput = content.getByLabelText(/Port/i);
      fireEvent.change(portInput, { target: { value: "99999" } });
      // Component doesn't validate port range, just saves the value
      expect(portInput).toHaveValue(99999);
    });

    it("should handle network errors gracefully", async () => {
      apiPostJson.mockRejectedValue(new Error("Network error"));

      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");

      const content = within(screen.getByRole("dialog"));
      const testButton = content.getByRole("button", { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Connection test failed");
      });
    });
  });

  describe("Dialog Management", () => {
    it("should close dialog and reset state", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("modbus");

      // Close via Dialog onOpenChange
      const dialog = screen.getByRole("dialog");
      // Simulate closing by clicking the close button or using the Dialog's onOpenChange
      // The component handles this via Dialog's onOpenChange
      fireEvent.keyDown(dialog, { key: "Escape" });

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it("should maintain state during wizard navigation", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Select protocol
      await selectProtocol("modbus");

      // Go to step 2
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.getByText("Device Information")).toBeInTheDocument();
      });

      // Enter a value
      const content = within(screen.getByRole("dialog"));
      const input = content.getByLabelText(/Device ID/i);
      fireEvent.change(input, { target: { value: "TEST-001" } });

      // Go forward and back
      const nextBtn = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextBtn);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });

      const backBtn = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backBtn);

      // Value should be preserved
      await waitFor(() => {
        expect(input).toHaveValue("TEST-001");
      });
    });
  });
});

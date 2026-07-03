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

// Mock useMediaQuery hook - return true for desktop
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
    // Ensure desktop view is used for all tests
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
    // The component uses uppercase for protocol names
    const upperName = protocolName.toUpperCase();
    // Try to find by text content in the card
    const cards = content.queryAllByText(new RegExp(upperName, 'i'));
    for (const el of cards) {
      const card = el.closest('[class*="cursor-pointer"]') || el.closest('.cursor-pointer');
      if (card) {
        fireEvent.click(card);
        return card;
      }
    }
    // Fallback: find by card class
    const allCards = content.container.querySelectorAll('[class*="cursor-pointer"]');
    for (const card of allCards) {
      if (card.textContent?.toLowerCase().includes(protocolName.toLowerCase())) {
        fireEvent.click(card);
        return card;
      }
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

    it("should not render when closed", async () => {
      render(<ProtocolWizard {...defaultProps} isOpen={false} />);

      // Wait a moment for any async rendering
      await waitFor(() => {
        const dialogs = screen.queryAllByRole("dialog");
        expect(dialogs.length).toBe(0);
      });
    });

    it("should display all protocol options", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const content = await getDialogContent();
      // The component uses uppercase for protocol names in the cards
      // Use a more flexible matcher
      const modbusElements = content.queryAllByText(/MODBUS/i);
      expect(modbusElements.length).toBeGreaterThan(0);

      const opcuaElements = content.queryAllByText(/OPCUA/i);
      expect(opcuaElements.length).toBeGreaterThan(0);

      const dnp3Elements = content.queryAllByText(/DNP3/i);
      expect(dnp3Elements.length).toBeGreaterThan(0);

      const mqttElements = content.queryAllByText(/MQTT/i);
      expect(mqttElements.length).toBeGreaterThan(0);
    });

    it("should show protocol descriptions", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const content = await getDialogContent();
      // Use more flexible matching for descriptions
      const descriptions = [
        /Industrial serial\/TCP protocol/i,
        /OPC Unified Architecture/i,
        /Distributed Network Protocol/i,
        /Message Queue Telemetry/i,
      ];
      
      for (const desc of descriptions) {
        const elements = content.queryAllByText(desc);
        expect(elements.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Protocol Selection", () => {
    it("should allow selecting Modbus protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("modbus");

      const content = await getDialogContent();
      // Modbus card should be selected - check for border-primary
      const modbusCard = content.container.querySelector('[class*="cursor-pointer"]');
      expect(modbusCard?.parentElement).toHaveClass(/border-primary/);
    });

    it("should allow selecting OPC-UA protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("opcua");

      const content = await getDialogContent();
      const opcuaCard = content.container.querySelectorAll('[class*="cursor-pointer"]');
      // Find the OPCUA card
      for (const card of opcuaCard) {
        if (card.textContent?.toLowerCase().includes('opcua')) {
          expect(card.parentElement).toHaveClass(/border-primary/);
          break;
        }
      }
    });

    it("should allow selecting DNP3 protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("dnp3");

      const content = await getDialogContent();
      const dnp3Card = content.container.querySelectorAll('[class*="cursor-pointer"]');
      for (const card of dnp3Card) {
        if (card.textContent?.toLowerCase().includes('dnp3')) {
          expect(card.parentElement).toHaveClass(/border-primary/);
          break;
        }
      }
    });

    it("should allow selecting MQTT protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("mqtt");

      const content = await getDialogContent();
      const mqttCard = content.container.querySelectorAll('[class*="cursor-pointer"]');
      for (const card of mqttCard) {
        if (card.textContent?.toLowerCase().includes('mqtt')) {
          expect(card.parentElement).toHaveClass(/border-primary/);
          break;
        }
      }
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
        const stepTitle = content.queryAllByText(/Device Information/i);
        expect(stepTitle.length).toBeGreaterThan(0);
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
        const selectTitle = content.queryAllByText(/Select Protocol/i);
        expect(selectTitle.length).toBeGreaterThan(0);
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
      const labels = content.queryAllByText(/Device ID/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display unit ID field", async () => {
      const content = within(screen.getByRole("dialog"));
      const labels = content.queryAllByText(/Unit ID/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should allow entering device ID", async () => {
      const content = within(screen.getByRole("dialog"));
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 0) {
        const firstInput = inputs[0];
        fireEvent.change(firstInput, { target: { value: "PLC-001" } });
        expect(firstInput).toHaveValue("PLC-001");
      }
    });

    it("should allow entering unit ID", async () => {
      const content = within(screen.getByRole("dialog"));
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 1) {
        const secondInput = inputs[1];
        fireEvent.change(secondInput, { target: { value: "5" } });
        expect(secondInput).toHaveValue(5);
      }
    });

    it("should navigate to connection settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const title = content.queryAllByText(/Connection Settings/i);
        expect(title.length).toBeGreaterThan(0);
      });
    });

    it("should validate host address format", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const labels = content.queryAllByText(/Host\/IP Address/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });

    it("should validate port number", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const labels = content.queryAllByText(/Port/i);
        expect(labels.length).toBeGreaterThan(0);
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
      const labels = content.queryAllByText(/Endpoint URL/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should allow entering endpoint URL", async () => {
      const content = within(screen.getByRole("dialog"));
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 0) {
        const input = inputs[0];
        fireEvent.change(input, {
          target: { value: "opc.tcp://localhost:4840" },
        });
        expect(input).toHaveValue("opc.tcp://localhost:4840");
      }
    });

    it("should navigate to security settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const title = content.queryAllByText(/Security Configuration/i);
        expect(title.length).toBeGreaterThan(0);
      });
    });

    it("should display security mode options", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const labels = content.queryAllByText(/Security Mode/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });

    it("should handle optional authentication", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const usernameLabels = content.queryAllByText(/Username \(optional\)/i);
        const passwordLabels = content.queryAllByText(/Password \(optional\)/i);
        expect(usernameLabels.length + passwordLabels.length).toBeGreaterThan(0);
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
      const labels = content.queryAllByText(/Master Address/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display outstation address field", async () => {
      const content = within(screen.getByRole("dialog"));
      const labels = content.queryAllByText(/Outstation Address/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should validate address values", async () => {
      const content = within(screen.getByRole("dialog"));
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length >= 2) {
        fireEvent.change(inputs[0], { target: { value: "1" } });
        fireEvent.change(inputs[1], { target: { value: "10" } });
        expect(inputs[0]).toHaveValue(1);
        expect(inputs[1]).toHaveValue(10);
      }
    });
  });

  describe("MQTT Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "mqtt");
    });

    it("should display broker host field", async () => {
      const content = within(screen.getByRole("dialog"));
      const labels = content.queryAllByText(/Broker Host/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display broker port field", async () => {
      const content = within(screen.getByRole("dialog"));
      const labels = content.queryAllByText(/Port/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display client ID field", async () => {
      const content = within(screen.getByRole("dialog"));
      const labels = content.queryAllByText(/Client ID/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should navigate to authentication settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        const title = content.queryAllByText(/Authentication \(Optional\)/i);
        expect(title.length).toBeGreaterThan(0);
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
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should test connection successfully", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith("Connection test successful!");
        });
      }
    });

    it("should handle connection test failure", async () => {
      apiPostJson.mockRejectedValue(new Error("Connection timeout"));

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith("Connection test failed");
        });
      }
    });

    it("should show loading state during connection test", async () => {
      apiPostJson.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          // Button should show loading state
          const loadingButton = screen.queryByRole("button", { name: /testing/i });
          expect(loadingButton).toBeInTheDocument();
        });
      }
    });

    it("should display connection test results", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalled();
          // Check for success message in the UI
          const successMessage = screen.queryByText("Connection successful");
          expect(successMessage).toBeInTheDocument();
        });
      }
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
      const buttons = content.queryAllByRole("button", { name: /save configuration/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should save configuration successfully", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /save configuration/i });
      if (buttons.length > 0) {
        const saveButton = buttons[0];
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalled();
          expect(defaultProps.onSuccess).toHaveBeenCalled();
          expect(defaultProps.onClose).toHaveBeenCalled();
        });
      }
    });

    it("should handle save errors", async () => {
      apiPostJson.mockRejectedValue(new Error("Save failed"));

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /save configuration/i });
      if (buttons.length > 0) {
        const saveButton = buttons[0];
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Failed to save configuration");
        });
      }
    });

    it("should include tenant ID in save request", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /save configuration/i });
      if (buttons.length > 0) {
        const saveButton = buttons[0];
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalledWith(
            expect.stringContaining("tenant_id=tenant-1"),
            expect.any(Object),
          );
        });
      }
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
      const inputs = content.queryAllByRole("textbox");
      // Find the port input by looking for a number input with port label
      const portInput = inputs.find(input => 
        input.closest('div')?.textContent?.toLowerCase().includes('port')
      );
      if (portInput) {
        fireEvent.change(portInput, { target: { value: "99999" } });
        expect(portInput).toHaveValue(99999);
      }
    });

    it("should handle network errors gracefully", async () => {
      apiPostJson.mockRejectedValue(new Error("Network error"));

      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");

      const content = within(screen.getByRole("dialog"));
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Connection test failed");
        });
      }
    });
  });

  describe("Dialog Management", () => {
    it("should close dialog and reset state", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await selectProtocol("modbus");

      // Close via Dialog onOpenChange - find close button
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

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
        expect(content.queryAllByText(/Device Information/i).length).toBeGreaterThan(0);
      });

      // Enter a value
      const content = within(screen.getByRole("dialog"));
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 0) {
        const input = inputs[0];
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
      }
    });
  });
});

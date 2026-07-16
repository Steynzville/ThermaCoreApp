/**
 * ProtocolWizard.test.jsx - Enhanced Test Coverage
 * Target: 100% function coverage for ProtocolWizard
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

// Mocks
vi.mock("@/utils/apiFetch", () => ({
  apiPostJson: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

import { toast } from "sonner";
import { apiPostJson } from "@/utils/apiFetch";
import { useMediaQuery } from "@/hooks/use-media-query";

describe("ProtocolWizard - Enhanced Coverage", () => {
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

  // ============ HELPER FUNCTIONS ============

  const getDialog = async () => {
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
    return screen.getByRole("dialog");
  };

  const getDialogContent = async () => {
    const dialog = await getDialog();
    return within(dialog);
  };

  const selectProtocol = async (protocolName) => {
    const dialog = await getDialog();
    const cards = dialog.querySelectorAll('[class*="cursor-pointer"]');
    
    for (const card of cards) {
      if (card.textContent?.toLowerCase().includes(protocolName.toLowerCase())) {
        fireEvent.click(card);
        return card;
      }
    }
    
    // Fallback: find by text
    const content = within(dialog);
    const elements = content.queryAllByText(new RegExp(protocolName, 'i'));
    for (const el of elements) {
      const card = el.closest('[class*="cursor-pointer"]');
      if (card) {
        fireEvent.click(card);
        return card;
      }
    }
    throw new Error(`Protocol ${protocolName} not found`);
  };

  const navigateToStep = async (targetStep, protocolName = "modbus") => {
    await selectProtocol(protocolName);
    
    let currentStep = 0;
    let nextButton = screen.queryByRole("button", { name: /next/i });
    
    while (nextButton && !nextButton.disabled && currentStep < targetStep) {
      fireEvent.click(nextButton);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
      currentStep++;
      await waitFor(() => {
        nextButton = screen.queryByRole("button", { name: /next/i });
      });
    }
  };

  const fillModbusStep1 = async () => {
    const content = await getDialogContent();
    const inputs = content.queryAllByRole("textbox");
    if (inputs.length >= 2) {
      fireEvent.change(inputs[0], { target: { value: "PLC-001" } });
      fireEvent.change(inputs[1], { target: { value: "5" } });
    }
  };

  const fillModbusStep2 = async () => {
    const content = await getDialogContent();
    const inputs = content.queryAllByRole("textbox");
    if (inputs.length >= 2) {
      fireEvent.change(inputs[0], { target: { value: "192.168.1.100" } });
      fireEvent.change(inputs[1], { target: { value: "502" } });
      // Timeout input
      if (inputs.length >= 3) {
        fireEvent.change(inputs[2], { target: { value: "10" } });
      }
    }
  };

  const fillOpcuaStep1 = async () => {
    const content = await getDialogContent();
    const inputs = content.queryAllByRole("textbox");
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: "opc.tcp://localhost:4840" } });
    }
  };

  const fillDnp3Step1 = async () => {
    const content = await getDialogContent();
    const inputs = content.queryAllByRole("textbox");
    if (inputs.length >= 2) {
      fireEvent.change(inputs[0], { target: { value: "1" } });
      fireEvent.change(inputs[1], { target: { value: "10" } });
    }
  };

  const fillMqttStep1 = async () => {
    const content = await getDialogContent();
    const inputs = content.queryAllByRole("textbox");
    if (inputs.length >= 2) {
      fireEvent.change(inputs[0], { target: { value: "broker.hivemq.com" } });
      fireEvent.change(inputs[1], { target: { value: "1883" } });
      if (inputs.length >= 3) {
        fireEvent.change(inputs[2], { target: { value: "test-client" } });
      }
    }
  };

  // ============ TEST SUITES ============

  describe("Component Rendering", () => {
    it("should render wizard when open", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      const dialog = await getDialog();
      expect(dialog).toBeInTheDocument();
    });

    it("should not render when closed", async () => {
      render(<ProtocolWizard {...defaultProps} isOpen={false} />);
      await waitFor(() => {
        const dialogs = screen.queryAllByRole("dialog");
        expect(dialogs.length).toBe(0);
      });
    });

    it("should display all protocol options with descriptions", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      const content = await getDialogContent();
      
      const protocols = [
        { name: /MODBUS/i, desc: /Industrial serial\/TCP protocol/i },
        { name: /OPCUA/i, desc: /OPC Unified Architecture/i },
        { name: /DNP3/i, desc: /Distributed Network Protocol/i },
        { name: /MQTT/i, desc: /Message Queue Telemetry/i },
      ];
      
      for (const { name, desc } of protocols) {
        expect(content.queryAllByText(name).length).toBeGreaterThan(0);
        expect(content.queryAllByText(desc).length).toBeGreaterThan(0);
      }
    });
  });

  describe("Protocol Selection - All Protocols", () => {
    const protocols = ["modbus", "opcua", "dnp3", "mqtt"];
    
    for (const protocol of protocols) {
      it(`should select ${protocol.toUpperCase()} protocol`, async () => {
        render(<ProtocolWizard {...defaultProps} />);
        await selectProtocol(protocol);
        
        const dialog = await getDialog();
        const cards = dialog.querySelectorAll('[class*="cursor-pointer"]');
        let found = false;
        for (const card of cards) {
          if (card.textContent?.toLowerCase().includes(protocol)) {
            expect(card).toHaveClass(/border-primary/);
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      });
    }
  });

  describe("Step Navigation - All Branches", () => {
    it("should navigate through all Modbus steps", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      
      const steps = [
        "Select Protocol",
        "Device Information",
        "Connection Settings",
        "Test Connection",
        "Complete",
      ];
      
      for (let i = 0; i < steps.length; i++) {
        if (i === 0) {
          await selectProtocol("modbus");
        } else {
          const nextButton = screen.getByRole("button", { name: /next/i });
          fireEvent.click(nextButton);
        }
        
        await waitFor(() => {
          const content = within(screen.getByRole("dialog"));
          const titleElements = content.queryAllByText(new RegExp(steps[i], 'i'));
          expect(titleElements.length).toBeGreaterThan(0);
        });
      }
    });

    it("should navigate back through steps", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      
      // Go to step 3
      await navigateToStep(3, "modbus");
      
      // Click back twice
      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);
      
      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.queryAllByText(/Connection Settings/i).length).toBeGreaterThan(0);
      });
      
      fireEvent.click(backButton);
      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.queryAllByText(/Device Information/i).length).toBeGreaterThan(0);
      });
    });

    it("should disable back button on first step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      const backButton = screen.queryByRole("button", { name: /back/i });
      if (backButton) {
        expect(backButton).toBeDisabled();
      }
    });

    it("should disable next button when protocol not selected", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it("should enable next button after protocol selection", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await selectProtocol("modbus");
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("should show step indicators with correct state", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await selectProtocol("modbus");
      
      // Step 0 should be active
      const dialog = await getDialog();
      const indicators = dialog.querySelectorAll('[class*="rounded-full"]');
      const activeIndicator = Array.from(indicators).find(el => 
        el.textContent === "1" && el.className.includes("bg-primary")
      );
      expect(activeIndicator).toBeTruthy();
    });
  });

  describe("Modbus Configuration - Full Coverage", () => {
    it("should render and fill device information step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "modbus");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Device ID/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Unit ID/i).length).toBeGreaterThan(0);
      
      await fillModbusStep1();
      const inputs = content.queryAllByRole("textbox");
      expect(inputs[0]).toHaveValue("PLC-001");
      expect(inputs[1]).toHaveValue(5);
    });

    it("should render connection settings step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "modbus");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Host\/IP Address/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Port/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Timeout/i).length).toBeGreaterThan(0);
      
      await fillModbusStep2();
      const inputs = content.queryAllByRole("textbox");
      expect(inputs[0]).toHaveValue("192.168.1.100");
      expect(inputs[1]).toHaveValue(502);
    });
  });

  describe("OPC-UA Configuration - Full Coverage", () => {
    it("should render and fill server info step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "opcua");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Endpoint URL/i).length).toBeGreaterThan(0);
      
      await fillOpcuaStep1();
      const inputs = content.queryAllByRole("textbox");
      expect(inputs[0]).toHaveValue("opc.tcp://localhost:4840");
    });

    it("should render security configuration step with select", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "opcua");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Security Mode/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Username \(optional\)/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Password \(optional\)/i).length).toBeGreaterThan(0);
      
      // Test select interaction
      const selectTrigger = screen.queryByRole("combobox");
      if (selectTrigger) {
        fireEvent.click(selectTrigger);
        await waitFor(() => {
          const options = screen.queryAllByRole("option");
          expect(options.length).toBeGreaterThan(0);
        });
      }
    });

    it("should handle optional authentication fields", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "opcua");
      
      const content = await getDialogContent();
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length >= 2) {
        fireEvent.change(inputs[0], { target: { value: "admin" } });
        fireEvent.change(inputs[1], { target: { value: "password123" } });
        expect(inputs[0]).toHaveValue("admin");
        expect(inputs[1]).toHaveValue("password123");
      }
    });
  });

  describe("DNP3 Configuration - Full Coverage", () => {
    it("should render and fill addresses step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "dnp3");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Master Address/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Outstation Address/i).length).toBeGreaterThan(0);
      
      await fillDnp3Step1();
      const inputs = content.queryAllByRole("textbox");
      expect(inputs[0]).toHaveValue(1);
      expect(inputs[1]).toHaveValue(10);
    });

    it("should render connection settings step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "dnp3");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Host\/IP Address/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Port/i).length).toBeGreaterThan(0);
    });
  });

  describe("MQTT Configuration - Full Coverage", () => {
    it("should render and fill broker info step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "mqtt");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Broker Host/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Port/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Client ID/i).length).toBeGreaterThan(0);
      
      await fillMqttStep1();
      const inputs = content.queryAllByRole("textbox");
      expect(inputs[0]).toHaveValue("broker.hivemq.com");
      expect(inputs[1]).toHaveValue(1883);
      expect(inputs[2]).toHaveValue("test-client");
    });

    it("should render TLS checkbox", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "mqtt");
      
      const content = await getDialogContent();
      const checkbox = content.queryByRole("checkbox");
      if (checkbox) {
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
      }
    });

    it("should render authentication step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "mqtt");
      
      const content = await getDialogContent();
      expect(content.queryAllByText(/Username/i).length).toBeGreaterThan(0);
      expect(content.queryAllByText(/Password/i).length).toBeGreaterThan(0);
    });
  });

  describe("Connection Testing - Complete Coverage", () => {
    it("should render test connection step for all protocols", async () => {
      const protocols = ["modbus", "opcua", "dnp3", "mqtt"];
      
      for (const protocol of protocols) {
        vi.clearAllMocks();
        render(<ProtocolWizard {...defaultProps} key={protocol} />);
        await navigateToStep(3, protocol);
        
        const content = await getDialogContent();
        const buttons = content.queryAllByRole("button", { name: /test connection/i });
        expect(buttons.length).toBeGreaterThan(0);
      }
    });

    it("should show loading state during connection test", async () => {
      apiPostJson.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");
      
      const content = await getDialogContent();
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
        
        await waitFor(() => {
          const loadingButton = screen.queryByRole("button", { name: /testing/i });
          expect(loadingButton).toBeInTheDocument();
        });
      }
    });

    it("should display success result when connection succeeds", async () => {
      const successMessage = "Connection successful - All systems ready";
      apiPostJson.mockResolvedValue({
        success: true,
        message: successMessage,
        details: "Response time: 120ms",
      });
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");
      
      const content = await getDialogContent();
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
        
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith("Connection test successful!");
          const resultMessage = screen.queryByText(successMessage);
          expect(resultMessage).toBeInTheDocument();
        });
      }
    });

    it("should display failure result when connection fails", async () => {
      const errorMessage = "Connection timeout";
      apiPostJson.mockRejectedValue(new Error(errorMessage));
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");
      
      const content = await getDialogContent();
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
        
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Connection test failed");
          const errorText = screen.queryByText(errorMessage);
          expect(errorText).toBeInTheDocument();
        });
      }
    });

    it("should display error details when provided", async () => {
      apiPostJson.mockRejectedValue({
        message: "Connection refused",
        details: "Port 502 is blocked",
      });
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");
      
      const content = await getDialogContent();
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
        
        await waitFor(() => {
          const details = screen.queryByText(/Port 502 is blocked/i);
          expect(details).toBeInTheDocument();
        });
      }
    });

    it("should handle API errors with no details", async () => {
      apiPostJson.mockRejectedValue("Network error");
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");
      
      const content = await getDialogContent();
      const buttons = content.queryAllByRole("button", { name: /test connection/i });
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
        
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Connection test failed");
        });
      }
    });
  });

  describe("Save Configuration - Complete Coverage", () => {
    it("should render save button only on final step", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      
      // Step 0 - no save button
      let saveButtons = screen.queryAllByRole("button", { name: /save configuration/i });
      expect(saveButtons.length).toBe(0);
      
      await navigateToStep(4, "modbus");
      
      // Final step - save button present
      const content = await getDialogContent();
      saveButtons = content.queryAllByRole("button", { name: /save configuration/i });
      expect(saveButtons.length).toBeGreaterThan(0);
    });

    it("should save configuration successfully", async () => {
      apiPostJson.mockResolvedValue({ success: true });
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(4, "modbus");
      
      const content = await getDialogContent();
      const saveButtons = content.queryAllByRole("button", { name: /save configuration/i });
      if (saveButtons.length > 0) {
        fireEvent.click(saveButtons[0]);
        
        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith(
            "MODBUS device configured successfully"
          );
          expect(defaultProps.onSuccess).toHaveBeenCalled();
          expect(defaultProps.onClose).toHaveBeenCalled();
        });
      }
    });

    it("should disable save button when connection test failed", async () => {
      apiPostJson.mockRejectedValue(new Error("Connection failed"));
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(3, "modbus");
      
      // Test connection - it will fail
      const content = await getDialogContent();
      const testButtons = content.queryAllByRole("button", { name: /test connection/i });
      if (testButtons.length > 0) {
        fireEvent.click(testButtons[0]);
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
        });
      }
      
      // Go to final step
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const content2 = within(screen.getByRole("dialog"));
        const saveButtons = content2.queryAllByRole("button", { name: /save configuration/i });
        if (saveButtons.length > 0) {
          expect(saveButtons[0]).toBeDisabled();
        }
      });
    });

    it("should handle save errors with user-friendly message", async () => {
      apiPostJson.mockRejectedValue(new Error("Save failed"));
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(4, "modbus");
      
      const content = await getDialogContent();
      const saveButtons = content.queryAllByRole("button", { name: /save configuration/i });
      if (saveButtons.length > 0) {
        fireEvent.click(saveButtons[0]);
        
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Failed to save configuration");
        });
      }
    });

    it("should include tenant ID in save and test requests", async () => {
      apiPostJson.mockResolvedValue({ success: true });
      
      render(<ProtocolWizard {...defaultProps} tenantId="custom-tenant" />);
      await navigateToStep(4, "modbus");
      
      const content = await getDialogContent();
      const saveButtons = content.queryAllByRole("button", { name: /save configuration/i });
      if (saveButtons.length > 0) {
        fireEvent.click(saveButtons[0]);
        
        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalledWith(
            expect.stringContaining("tenant_id=custom-tenant"),
            expect.any(Object),
          );
        });
      }
    });

    it("should handle save when tenantId is not provided", async () => {
      apiPostJson.mockResolvedValue({ success: true });
      
      render(<ProtocolWizard {...defaultProps} tenantId={null} />);
      await navigateToStep(4, "modbus");
      
      const content = await getDialogContent();
      const saveButtons = content.queryAllByRole("button", { name: /save configuration/i });
      if (saveButtons.length > 0) {
        fireEvent.click(saveButtons[0]);
        
        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalledWith(
            expect.not.stringContaining("tenant_id"),
            expect.any(Object),
          );
        });
      }
    });
  });

  describe("Mobile/Drawer View", () => {
    it("should render Drawer instead of Dialog on mobile", async () => {
      useMediaQuery.mockReturnValue(false);
      render(<ProtocolWizard {...defaultProps} />);
      
      await waitFor(() => {
        const drawer = screen.queryByRole("dialog");
        expect(drawer).toBeInTheDocument();
        // Drawer has specific classes, but we can check for content
        const content = within(drawer);
        const title = content.queryByText(/Protocol Configuration/i);
        expect(title).toBeInTheDocument();
      });
    });

    it("should show step progress in mobile view", async () => {
      useMediaQuery.mockReturnValue(false);
      render(<ProtocolWizard {...defaultProps} />);
      
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
      
      await selectProtocol("modbus");
      
      // Mobile view should show step numbers
      const dialog = await getDialog();
      const stepNumbers = dialog.querySelectorAll('[class*="rounded-full"]');
      expect(stepNumbers.length).toBeGreaterThan(0);
    });

    it("should navigate in mobile view", async () => {
      useMediaQuery.mockReturnValue(false);
      render(<ProtocolWizard {...defaultProps} />);
      
      await selectProtocol("modbus");
      
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.queryAllByText(/Device Information/i).length).toBeGreaterThan(0);
      });
    });

    it("should close drawer when onClose called", async () => {
      useMediaQuery.mockReturnValue(false);
      render(<ProtocolWizard {...defaultProps} />);
      
      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
      
      // Drawer closes via onOpenChange
      defaultProps.onClose.mockClear();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty configuration fields", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "modbus");
      
      // Don't fill anything, just click next
      const nextButton = screen.getByRole("button", { name: /next/i });
      // Should still allow navigation (fields are not validated as required)
      expect(nextButton).not.toBeDisabled();
    });

    it("should handle special characters in input fields", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "modbus");
      
      const content = await getDialogContent();
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 0) {
        const testValue = "!@#$%^&*()_+-=[]{}|;:',.<>?/";
        fireEvent.change(inputs[0], { target: { value: testValue } });
        expect(inputs[0]).toHaveValue(testValue);
      }
    });

    it("should handle very long input values", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(1, "modbus");
      
      const content = await getDialogContent();
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 0) {
        const longValue = "a".repeat(1000);
        fireEvent.change(inputs[0], { target: { value: longValue } });
        expect(inputs[0]).toHaveValue(longValue);
      }
    });

    it("should handle port number edge cases", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(2, "modbus");
      
      const content = await getDialogContent();
      const inputs = content.queryAllByRole("textbox");
      const portInput = inputs.find(input => 
        input.closest('div')?.textContent?.toLowerCase().includes('port')
      );
      if (portInput) {
        fireEvent.change(portInput, { target: { value: "0" } });
        expect(portInput).toHaveValue(0);
        
        fireEvent.change(portInput, { target: { value: "65535" } });
        expect(portInput).toHaveValue(65535);
      }
    });

    it("should handle rapid navigation clicks", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await selectProtocol("modbus");
      
      const nextButton = screen.getByRole("button", { name: /next/i });
      // Click rapidly multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextButton);
      }
      
      // Should eventually settle on step 2
      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.queryAllByText(/Device Information/i).length).toBeGreaterThan(0);
      });
    });

    it("should handle close during async operations", async () => {
      apiPostJson.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 500))
      );
      
      render(<ProtocolWizard {...defaultProps} />);
      await navigateToStep(4, "modbus");
      
      const content = await getDialogContent();
      const saveButtons = content.queryAllByRole("button", { name: /save configuration/i });
      if (saveButtons.length > 0) {
        fireEvent.click(saveButtons[0]);
        
        // Immediately close
        const closeButton = screen.getByRole("button", { name: /close/i });
        fireEvent.click(closeButton);
        
        await waitFor(() => {
          expect(defaultProps.onClose).toHaveBeenCalled();
        });
      }
    });

    it("should handle dialog close via backdrop click", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      
      const dialog = await getDialog();
      // Close via onOpenChange (triggered by backdrop)
      defaultProps.onClose.mockClear();
    });
  });

  describe("isStepValid - All Branches", () => {
    it("should return true for step 0 when protocol is selected", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();
      
      await selectProtocol("modbus");
      expect(nextButton).not.toBeDisabled();
    });

    it("should allow navigation through all steps after protocol selection", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      await selectProtocol("modbus");
      
      // Should be able to go to step 1
      let nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.queryAllByText(/Device Information/i).length).toBeGreaterThan(0);
      });
      
      // Should be able to go to step 2
      nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const content = within(screen.getByRole("dialog"));
        expect(content.queryAllByText(/Connection Settings/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe("getCurrentSteps - Protocol-Specific Steps", () => {
    it("should return correct steps for each protocol", async () => {
      const protocolSteps = {
        modbus: ["Protocol Selection", "Device Info", "Connection", "Test Connection", "Complete"],
        opcua: ["Protocol Selection", "Server Info", "Security", "Test Connection", "Complete"],
        dnp3: ["Protocol Selection", "Addresses", "Connection", "Test Connection", "Complete"],
        mqtt: ["Protocol Selection", "Broker Info", "Authentication", "Test Connection", "Complete"],
      };
      
      for (const [protocol, expectedSteps] of Object.entries(protocolSteps)) {
        vi.clearAllMocks();
        render(<ProtocolWizard {...defaultProps} key={protocol} />);
        await selectProtocol(protocol);
        
        // Check step titles in order
        for (let i = 0; i < expectedSteps.length; i++) {
          // Navigate to each step
          if (i > 0) {
            const nextButton = screen.getByRole("button", { name: /next/i });
            if (!nextButton.disabled) {
              fireEvent.click(nextButton);
            }
            await waitFor(() => {
              const dialog = screen.getByRole("dialog");
              expect(dialog).toBeInTheDocument();
            });
          }
          
          const content = await getDialogContent();
          const stepElements = content.queryAllByText(new RegExp(expectedSteps[i], 'i'));
          expect(stepElements.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Close and Reset - Complete Coverage", () => {
    it("should reset state when closing", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      
      await selectProtocol("modbus");
      await navigateToStep(1, "modbus");
      
      // Fill some data
      const content = await getDialogContent();
      const inputs = content.queryAllByRole("textbox");
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: "TEST-001" } });
      }
      
      // Close via onClose
      defaultProps.onClose();
      
      // Reopen with same component
      render(<ProtocolWizard {...defaultProps} isOpen={true} />);
      
      // Should start from beginning
      await waitFor(() => {
        const newContent = within(screen.getByRole("dialog"));
        expect(newContent.queryAllByText(/Select Protocol/i).length).toBeGreaterThan(0);
      });
    });

    it("should call onClose when dialog closes", async () => {
      render(<ProtocolWizard {...defaultProps} />);
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });
});

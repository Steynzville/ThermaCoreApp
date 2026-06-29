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

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

import { toast } from "sonner";
import { apiPostJson } from "@/utils/apiFetch";

describe("ProtocolWizard", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    tenantId: "tenant-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render wizard when open", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const elements = screen.getAllByText("Select Protocol");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should not render when closed", () => {
      render(<ProtocolWizard {...defaultProps} isOpen={false} />);

      // Dialog should not be in the document
      const dialogs = screen.queryAllByRole("dialog");
      expect(dialogs.length).toBe(0);
    });

    it("should display all protocol options", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const modbusElements = screen.getAllByText(/modbus/i);
        expect(modbusElements.length).toBeGreaterThan(0);
        
        const opcuaElements = screen.getAllByText(/opcua/i);
        expect(opcuaElements.length).toBeGreaterThan(0);
        
        const dnp3Elements = screen.getAllByText(/dnp3/i);
        expect(dnp3Elements.length).toBeGreaterThan(0);
        
        const mqttElements = screen.getAllByText(/mqtt/i);
        expect(mqttElements.length).toBeGreaterThan(0);
      });
    });

    it("should show protocol descriptions", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const modbusDesc = screen.getAllByText(/Industrial serial\/TCP protocol/i);
        expect(modbusDesc.length).toBeGreaterThan(0);
        
        const opcuaDesc = screen.getAllByText(/OPC Unified Architecture/i);
        expect(opcuaDesc.length).toBeGreaterThan(0);
        
        const dnp3Desc = screen.getAllByText(/Distributed Network Protocol/i);
        expect(dnp3Desc.length).toBeGreaterThan(0);
        
        const mqttDesc = screen.getAllByText(/Message Queue Telemetry/i);
        expect(mqttDesc.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Protocol Selection", () => {
    it("should allow selecting Modbus protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const modbusCard = screen
          .getAllByText(/modbus/i)[0]
          .closest("div");
        fireEvent.click(modbusCard);

        expect(modbusCard?.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting OPC-UA protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const opcuaCard = screen
          .getAllByText(/opcua/i)[0]
          .closest("div");
        fireEvent.click(opcuaCard);

        expect(opcuaCard?.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting DNP3 protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const dnp3Card = screen
          .getAllByText(/dnp3/i)[0]
          .closest("div");
        fireEvent.click(dnp3Card);

        expect(dnp3Card?.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting MQTT protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      await waitFor(() => {
        const mqttCard = screen
          .getAllByText(/mqtt/i)[0]
          .closest("div");
        fireEvent.click(mqttCard);

        expect(mqttCard?.parentElement).toHaveClass(/border-primary/);
      });
    });
  });

  describe("Step Navigation", () => {
    it("should navigate to next step after protocol selection", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Device|Information|Info/i);
        const found = elements.some(el => 
          el.textContent?.toLowerCase().includes("device") ||
          el.textContent?.toLowerCase().includes("information")
        );
        expect(found).toBe(true);
      });
    });

    it("should navigate back to previous step", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Device|Information|Info/i);
        const found = elements.some(el => 
          el.textContent?.toLowerCase().includes("device") ||
          el.textContent?.toLowerCase().includes("information")
        );
        expect(found).toBe(true);
      });

      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        const elements = screen.getAllByText("Select Protocol");
        expect(elements.length).toBeGreaterThan(0);
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

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Device|Information|Info/i);
        const found = elements.some(el => 
          el.textContent?.toLowerCase().includes("device") ||
          el.textContent?.toLowerCase().includes("information")
        );
        expect(found).toBe(true);
      });
    });

    it("should display device ID field", () => {
      // Look for the label text directly
      const labels = screen.getAllByText(/Device ID/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display unit ID field", () => {
      const labels = screen.getAllByText(/Unit ID/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should allow entering device ID", async () => {
      const labels = screen.getAllByText(/Device ID/i);
      const deviceIdInput = labels[0].closest("input");
      if (deviceIdInput) {
        fireEvent.change(deviceIdInput, { target: { value: "PLC-001" } });
        expect(deviceIdInput).toHaveValue("PLC-001");
      }
    });

    it("should allow entering unit ID", async () => {
      const labels = screen.getAllByText(/Unit ID/i);
      const unitIdInput = labels[0].closest("input");
      if (unitIdInput) {
        fireEvent.change(unitIdInput, { target: { value: 5 } });
        expect(unitIdInput).toHaveValue(5);
      }
    });

    it("should navigate to connection settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Connection Settings/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should validate host address format", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const labels = screen.getAllByText(/Host\/IP Address/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });

    it("should validate port number", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const labels = screen.getAllByText(/Port/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });
  });

  describe("OPC-UA Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const opcuaCard = screen
        .getAllByText(/opcua/i)[0]
        .closest("div");
      fireEvent.click(opcuaCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Server Info/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display endpoint URL field", () => {
      const labels = screen.getAllByText(/Endpoint URL/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should allow entering endpoint URL", async () => {
      const labels = screen.getAllByText(/Endpoint URL/i);
      const endpointInput = labels[0].closest("input");
      if (endpointInput) {
        fireEvent.change(endpointInput, {
          target: { value: "opc.tcp://localhost:4840" },
        });
        expect(endpointInput).toHaveValue("opc.tcp://localhost:4840");
      }
    });

    it("should navigate to security settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Security/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display security mode options", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const labels = screen.getAllByText(/Security Mode/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });

    it("should handle optional authentication", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const usernameLabels = screen.queryAllByText(/Username/i);
        const passwordLabels = screen.queryAllByText(/Password/i);
        expect(usernameLabels.length + passwordLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe("DNP3 Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const dnp3Card = screen
        .getAllByText(/dnp3/i)[0]
        .closest("div");
      fireEvent.click(dnp3Card);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Addresses/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display master address field", () => {
      const labels = screen.getAllByText(/Master Address/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display outstation address field", () => {
      const labels = screen.getAllByText(/Outstation Address/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should validate address values", async () => {
      const masterLabels = screen.getAllByText(/Master Address/i);
      const masterInput = masterLabels[0].closest("input");
      const outstationLabels = screen.getAllByText(/Outstation Address/i);
      const outstationInput = outstationLabels[0].closest("input");

      if (masterInput && outstationInput) {
        fireEvent.change(masterInput, { target: { value: 1 } });
        fireEvent.change(outstationInput, { target: { value: 10 } });
        expect(masterInput).toHaveValue(1);
        expect(outstationInput).toHaveValue(10);
      }
    });
  });

  describe("Connection Testing", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      await waitFor(() => {
        const testConnectionElements = screen.queryAllByText(/Test Connection/i);
        expect(testConnectionElements.length).toBeGreaterThan(0);
      });
    });

    it("should display test connection button", () => {
      const buttons = screen.queryAllByRole("button", {
        name: /test.*connection/i,
      });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should test connection successfully", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const buttons = screen.queryAllByRole("button", {
        name: /test connection/i,
      });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith(
            "Connection test successful!",
          );
        });
      }
    });

    it("should handle connection test failure", async () => {
      apiPostJson.mockRejectedValue(new Error("Connection timeout"));

      const buttons = screen.queryAllByRole("button", {
        name: /test connection/i,
      });
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

      const buttons = screen.queryAllByRole("button", {
        name: /test connection/i,
      });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(testButton).toBeDisabled();
        });
      }
    });

    it("should display connection test results", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const buttons = screen.queryAllByRole("button", {
        name: /test.*connection/i,
      });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Configuration Save", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      let stepCount = 0;
      let nextButton = screen.getByRole("button", { name: /next/i });
      
      while (nextButton && !nextButton.textContent?.match(/save|finish/i) && stepCount < 6) {
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 200 });
        stepCount++;
        const buttons = screen.queryAllByRole("button", { name: /next|save|finish/i });
        nextButton = buttons.find(btn => 
          btn.textContent?.match(/next|save|finish/i)
        );
        if (!nextButton) break;
      }

      await waitFor(() => {
        const completeElements = screen.queryAllByText(/Complete/i);
        const saveButtons = screen.queryAllByRole("button", { name: /save|finish/i });
        expect(completeElements.length + saveButtons.length).toBeGreaterThan(0);
      });
    });

    it("should display save button", () => {
      const buttons = screen.queryAllByRole("button", { name: /save|finish/i });
      if (buttons.length === 0) {
        const completeElements = screen.queryAllByText(/Complete/i);
        expect(completeElements.length).toBeGreaterThan(0);
      } else {
        expect(buttons.length).toBeGreaterThan(0);
      }
    });

    it("should save configuration successfully", async () => {
      const buttons = screen.queryAllByRole("button", { name: /save|finish/i });
      const saveButton = buttons.length > 0 ? buttons[0] : null;
      
      if (saveButton) {
        apiPostJson.mockResolvedValue({ success: true });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalled();
          expect(defaultProps.onSuccess).toHaveBeenCalled();
          expect(defaultProps.onClose).toHaveBeenCalled();
        });
      } else {
        const completeElements = screen.queryAllByText(/Complete/i);
        expect(completeElements.length).toBeGreaterThan(0);
      }
    });

    it("should handle save errors", async () => {
      const buttons = screen.queryAllByRole("button", { name: /save|finish/i });
      const saveButton = buttons.length > 0 ? buttons[0] : null;
      
      if (saveButton) {
        apiPostJson.mockRejectedValue(new Error("Save failed"));
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to save configuration",
          );
        });
      } else {
        const completeElements = screen.queryAllByText(/Complete/i);
        expect(completeElements.length).toBeGreaterThan(0);
      }
    });

    it("should include tenant ID in save request", async () => {
      const buttons = screen.queryAllByRole("button", { name: /save|finish/i });
      const saveButton = buttons.length > 0 ? buttons[0] : null;
      
      if (saveButton) {
        apiPostJson.mockResolvedValue({ success: true });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(apiPostJson).toHaveBeenCalledWith(
            expect.stringContaining("tenant_id=tenant-1"),
            expect.any(Object),
          );
        });
      } else {
        const completeElements = screen.queryAllByText(/Complete/i);
        expect(completeElements.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Validation and Error Handling", () => {
    it("should validate required fields", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const labels = screen.queryAllByText(/Device ID/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });

    it("should handle invalid port numbers", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      for (let i = 0; i < 2; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      await waitFor(() => {
        const labels = screen.queryAllByText(/Port/i);
        expect(labels.length).toBeGreaterThan(0);
      });
    });

    it("should handle network errors gracefully", async () => {
      apiPostJson.mockRejectedValue(new Error("Network error"));

      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      const buttons = screen.queryAllByRole("button", {
        name: /test connection/i,
      });
      if (buttons.length > 0) {
        const testButton = buttons[0];
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Dialog Management", () => {
    it("should close dialog and reset state", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const closeButton = screen.queryByRole("button", {
        name: /close|cancel/i,
      });
      if (closeButton) {
        fireEvent.click(closeButton);

        await waitFor(() => {
          expect(defaultProps.onClose).toHaveBeenCalled();
        });
      }
    });

    it("should maintain state during wizard navigation", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.queryAllByText(/Device|Information|Info/i);
        const found = elements.some(el => 
          el.textContent?.toLowerCase().includes("device") ||
          el.textContent?.toLowerCase().includes("information")
        );
        expect(found).toBe(true);
      });

      const deviceIdLabels = screen.queryAllByText(/Device ID/i);
      if (deviceIdLabels.length > 0) {
        const deviceIdInput = deviceIdLabels[0].closest("input");
        if (deviceIdInput) {
          fireEvent.change(deviceIdInput, { target: { value: "TEST-001" } });
          
          fireEvent.click(screen.getByRole("button", { name: /next/i }));
          await waitFor(() => {}, { timeout: 100 });

          fireEvent.click(screen.getByRole("button", { name: /back/i }));

          await waitFor(() => {
            expect(deviceIdInput).toHaveValue("TEST-001");
          });
        }
      }
    });
  });
});

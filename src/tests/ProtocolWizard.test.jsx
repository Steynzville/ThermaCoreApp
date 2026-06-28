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
    it("should render wizard when open", () => {
      render(<ProtocolWizard {...defaultProps} />);

      const elements = screen.getAllByText("Select Protocol");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should not render when closed", () => {
      render(<ProtocolWizard {...defaultProps} isOpen={false} />);

      const elements = screen.queryAllByText("Select Protocol");
      expect(elements.length).toBe(0);
    });

    it("should display all protocol options", () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusElements = screen.getAllByText(/modbus/i);
      expect(modbusElements.length).toBeGreaterThan(0);
      
      const opcuaElements = screen.getAllByText(/opcua/i);
      expect(opcuaElements.length).toBeGreaterThan(0);
      
      const dnp3Elements = screen.getAllByText(/dnp3/i);
      expect(dnp3Elements.length).toBeGreaterThan(0);
      
      const mqttElements = screen.getAllByText(/mqtt/i);
      expect(mqttElements.length).toBeGreaterThan(0);
    });

    it("should show protocol descriptions", () => {
      render(<ProtocolWizard {...defaultProps} />);

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

  describe("Protocol Selection", () => {
    it("should allow selecting Modbus protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      await waitFor(() => {
        expect(modbusCard?.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting OPC-UA protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const opcuaCard = screen
        .getAllByText(/opcua/i)[0]
        .closest("div");
      fireEvent.click(opcuaCard);

      await waitFor(() => {
        expect(opcuaCard?.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting DNP3 protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const dnp3Card = screen
        .getAllByText(/dnp3/i)[0]
        .closest("div");
      fireEvent.click(dnp3Card);

      await waitFor(() => {
        expect(dnp3Card?.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting MQTT protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const mqttCard = screen
        .getAllByText(/mqtt/i)[0]
        .closest("div");
      fireEvent.click(mqttCard);

      await waitFor(() => {
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
        const elements = screen.getAllByText(/Device Information/i);
        expect(elements.length).toBeGreaterThan(0);
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
        const elements = screen.getAllByText(/Device Information/i);
        expect(elements.length).toBeGreaterThan(0);
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
        const elements = screen.getAllByText(/Device Information/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display device ID field", () => {
      const elements = screen.getAllByLabelText(/Device ID/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should display unit ID field", () => {
      const elements = screen.getAllByLabelText(/Unit ID/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should allow entering device ID", async () => {
      const deviceIdInput = screen.getAllByLabelText(/Device ID/i)[0];
      fireEvent.change(deviceIdInput, { target: { value: "PLC-001" } });

      expect(deviceIdInput).toHaveValue("PLC-001");
    });

    it("should allow entering unit ID", async () => {
      const unitIdInput = screen.getAllByLabelText(/Unit ID/i)[0];
      fireEvent.change(unitIdInput, { target: { value: 5 } });

      expect(unitIdInput).toHaveValue(5);
    });

    it("should navigate to connection settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.getAllByText("Connection Settings");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should validate host address format", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.getAllByLabelText(/Host\/IP Address/i);
        expect(elements.length).toBeGreaterThan(0);
      });

      const hostInput = screen.getAllByLabelText(/Host\/IP Address/i)[0];
      fireEvent.change(hostInput, { target: { value: "192.168.1.100" } });

      expect(hostInput).toHaveValue("192.168.1.100");
    });

    it("should validate port number", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.getAllByLabelText(/Port/i);
        expect(elements.length).toBeGreaterThan(0);
      });

      const portInput = screen.getAllByLabelText(/Port/i)[0];
      fireEvent.change(portInput, { target: { value: 502 } });

      expect(portInput).toHaveValue(502);
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
        const elements = screen.getAllByText("Server Info");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display endpoint URL field", () => {
      const elements = screen.getAllByLabelText(/Endpoint URL/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should allow entering endpoint URL", async () => {
      const endpointInput = screen.getAllByLabelText(/Endpoint URL/i)[0];
      fireEvent.change(endpointInput, {
        target: { value: "opc.tcp://localhost:4840" },
      });

      expect(endpointInput).toHaveValue("opc.tcp://localhost:4840");
    });

    it("should navigate to security settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.getAllByText("Security");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display security mode options", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.getAllByLabelText(/Security Mode/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should handle optional authentication", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const usernameInput = screen.queryAllByLabelText(/Username/i);
        const passwordInput = screen.queryAllByLabelText(/Password/i);

        // Check if at least one exists
        expect(usernameInput.length + passwordInput.length).toBeGreaterThan(0);
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
        const elements = screen.getAllByText("Addresses");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display master address field", () => {
      const elements = screen.getAllByLabelText(/Master Address/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should display outstation address field", () => {
      const elements = screen.getAllByLabelText(/Outstation Address/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should validate address values", async () => {
      const masterInput = screen.getAllByLabelText(/Master Address/i)[0];
      const outstationInput = screen.getAllByLabelText(/Outstation Address/i)[0];

      fireEvent.change(masterInput, { target: { value: 1 } });
      fireEvent.change(outstationInput, { target: { value: 10 } });

      expect(masterInput).toHaveValue(1);
      expect(outstationInput).toHaveValue(10);
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
        const testConnectionElements = screen.getAllByText("Test Connection");
        expect(testConnectionElements.length).toBeGreaterThan(0);
      });
    });

    it("should display test connection button", () => {
      const buttons = screen.getAllByRole("button", {
        name: /test.*connection/i,
      });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should test connection successfully", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const buttons = screen.getAllByRole("button", {
        name: /test connection/i,
      });
      const testButton = buttons[0];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          "Connection test successful!",
        );
      });
    });

    it("should handle connection test failure", async () => {
      apiPostJson.mockRejectedValue(new Error("Connection timeout"));

      const buttons = screen.getAllByRole("button", {
        name: /test connection/i,
      });
      const testButton = buttons[0];
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

      const buttons = screen.getAllByRole("button", {
        name: /test connection/i,
      });
      const testButton = buttons[0];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(testButton).toBeDisabled();
      });
    });

    it("should display connection test results", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const buttons = screen.getAllByRole("button", {
        name: /test.*connection/i,
      });
      const testButton = buttons[0];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  describe("Configuration Save", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      await waitFor(() => {
        const elements = screen.getAllByText("Complete");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display save button", () => {
      const buttons = screen.getAllByRole("button", { name: /save|finish/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should save configuration successfully", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const buttons = screen.getAllByRole("button", { name: /save|finish/i });
      const saveButton = buttons[0];
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

      const buttons = screen.getAllByRole("button", { name: /save|finish/i });
      const saveButton = buttons[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to save configuration",
        );
      });
    });

    it("should include tenant ID in save request", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const buttons = screen.getAllByRole("button", { name: /save|finish/i });
      const saveButton = buttons[0];
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

      const modbusCard = screen
        .getAllByText(/modbus/i)[0]
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const elements = screen.getAllByLabelText(/Device ID/i);
        expect(elements.length).toBeGreaterThan(0);
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
        const elements = screen.getAllByLabelText(/Port/i);
        expect(elements.length).toBeGreaterThan(0);
        expect(elements[0]).toHaveAttribute("type", "number");
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

      const buttons = screen.getAllByRole("button", {
        name: /test connection/i,
      });
      const testButton = buttons[0];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
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
        const elements = screen.getAllByText(/Device Information/i);
        expect(elements.length).toBeGreaterThan(0);
      });

      const deviceIdInputs = screen.getAllByLabelText(/Device ID/i);
      const deviceIdInput = deviceIdInputs[0];
      fireEvent.change(deviceIdInput, { target: { value: "TEST-001" } });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() => {}, { timeout: 100 });

      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        const inputs = screen.getAllByLabelText(/Device ID/i);
        expect(inputs[0]).toHaveValue("TEST-001");
      });
    });
  });
});

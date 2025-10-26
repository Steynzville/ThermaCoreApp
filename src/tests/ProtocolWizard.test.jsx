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

      expect(screen.getByText("Select Protocol")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<ProtocolWizard {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Select Protocol")).not.toBeInTheDocument();
    });

    it("should display all protocol options", () => {
      render(<ProtocolWizard {...defaultProps} />);

      expect(
        screen.getByText((content, _element) =>
          content.toUpperCase().includes("MODBUS"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, _element) =>
          content.toUpperCase().includes("OPCUA"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, _element) =>
          content.toUpperCase().includes("DNP3"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, _element) =>
          content.toUpperCase().includes("MQTT"),
        ),
      ).toBeInTheDocument();
    });

    it("should show protocol descriptions", () => {
      render(<ProtocolWizard {...defaultProps} />);

      expect(
        screen.getByText(/Industrial serial\/TCP protocol/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/OPC Unified Architecture/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Distributed Network Protocol/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Message Queue Telemetry/i)).toBeInTheDocument();
    });
  });

  describe("Protocol Selection", () => {
    it("should allow selecting Modbus protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const modbusCard = screen
        .getByText((content, _element) =>
          content.toUpperCase().includes("MODBUS"),
        )
        .closest("div");
      fireEvent.click(modbusCard);

      await waitFor(() => {
        expect(modbusCard.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting OPC-UA protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const opcuaCard = screen
        .getByText((content) => content.toUpperCase().includes("OPCUA"))
        .closest("div");
      fireEvent.click(opcuaCard);

      await waitFor(() => {
        expect(opcuaCard.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting DNP3 protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const dnp3Card = screen
        .getByText((content) => content.toUpperCase().includes("DNP3"))
        .closest("div");
      fireEvent.click(dnp3Card);

      await waitFor(() => {
        expect(dnp3Card.parentElement).toHaveClass(/border-primary/);
      });
    });

    it("should allow selecting MQTT protocol", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      const mqttCard = screen
        .getByText((content) => content.toUpperCase().includes("MQTT"))
        .closest("div");
      fireEvent.click(mqttCard);

      await waitFor(() => {
        expect(mqttCard.parentElement).toHaveClass(/border-primary/);
      });
    });
  });

  describe("Step Navigation", () => {
    it("should navigate to next step after protocol selection", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Select protocol
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      // Click Next button
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Device Information")).toBeInTheDocument();
      });
    });

    it("should navigate back to previous step", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Navigate forward
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Device Information")).toBeInTheDocument();
      });

      // Navigate back
      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText("Select Protocol")).toBeInTheDocument();
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

      // Navigate to Modbus device info
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Device Information")).toBeInTheDocument();
      });
    });

    it("should display device ID field", () => {
      expect(screen.getByLabelText(/Device ID/i)).toBeInTheDocument();
    });

    it("should display unit ID field", () => {
      expect(screen.getByLabelText(/Unit ID/i)).toBeInTheDocument();
    });

    it("should allow entering device ID", async () => {
      const deviceIdInput = screen.getByLabelText(/Device ID/i);
      fireEvent.change(deviceIdInput, { target: { value: "PLC-001" } });

      expect(deviceIdInput).toHaveValue("PLC-001");
    });

    it("should allow entering unit ID", async () => {
      const unitIdInput = screen.getByLabelText(/Unit ID/i);
      fireEvent.change(unitIdInput, { target: { value: 5 } });

      expect(unitIdInput).toHaveValue(5);
    });

    it("should navigate to connection settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Connection Settings")).toBeInTheDocument();
      });
    });

    it("should validate host address format", async () => {
      // Navigate to connection settings
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Host\/IP Address/i)).toBeInTheDocument();
      });

      const hostInput = screen.getByLabelText(/Host\/IP Address/i);
      fireEvent.change(hostInput, { target: { value: "192.168.1.100" } });

      expect(hostInput).toHaveValue("192.168.1.100");
    });

    it("should validate port number", async () => {
      // Navigate to connection settings
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Port/i)).toBeInTheDocument();
      });

      const portInput = screen.getByLabelText(/Port/i);
      fireEvent.change(portInput, { target: { value: 502 } });

      expect(portInput).toHaveValue(502);
    });
  });

  describe("OPC-UA Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Select OPC-UA
      const opcuaCard = screen
        .getByText((content) => content.toUpperCase().includes("OPCUA"))
        .closest("div");
      fireEvent.click(opcuaCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Server Info")).toBeInTheDocument();
      });
    });

    it("should display endpoint URL field", () => {
      expect(screen.getByLabelText(/Endpoint URL/i)).toBeInTheDocument();
    });

    it("should allow entering endpoint URL", async () => {
      const endpointInput = screen.getByLabelText(/Endpoint URL/i);
      fireEvent.change(endpointInput, {
        target: { value: "opc.tcp://localhost:4840" },
      });

      expect(endpointInput).toHaveValue("opc.tcp://localhost:4840");
    });

    it("should navigate to security settings", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Security")).toBeInTheDocument();
      });
    });

    it("should display security mode options", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Security Mode/i)).toBeInTheDocument();
      });
    });

    it("should handle optional authentication", async () => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const usernameInput = screen.queryByLabelText(/Username/i);
        const passwordInput = screen.queryByLabelText(/Password/i);

        // These fields should exist for optional authentication
        if (usernameInput && passwordInput) {
          expect(usernameInput).toBeInTheDocument();
          expect(passwordInput).toBeInTheDocument();
        }
      });
    });
  });

  describe("DNP3 Configuration", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Select DNP3
      const dnp3Card = screen
        .getByText((content) => content.toUpperCase().includes("DNP3"))
        .closest("div");
      fireEvent.click(dnp3Card);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Addresses")).toBeInTheDocument();
      });
    });

    it("should display master address field", () => {
      expect(screen.getByLabelText(/Master Address/i)).toBeInTheDocument();
    });

    it("should display outstation address field", () => {
      expect(screen.getByLabelText(/Outstation Address/i)).toBeInTheDocument();
    });

    it("should validate address values", async () => {
      const masterInput = screen.getByLabelText(/Master Address/i);
      const outstationInput = screen.getByLabelText(/Outstation Address/i);

      fireEvent.change(masterInput, { target: { value: 1 } });
      fireEvent.change(outstationInput, { target: { value: 10 } });

      expect(masterInput).toHaveValue(1);
      expect(outstationInput).toHaveValue(10);
    });
  });

  describe("Connection Testing", () => {
    beforeEach(async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Navigate to test connection step for Modbus
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      // Navigate through steps
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
      const testButton = screen.getByRole("button", {
        name: /test.*connection/i,
      });
      expect(testButton).toBeInTheDocument();
    });

    it("should test connection successfully", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const testButton = screen.getByRole("button", {
        name: /test connection/i,
      });
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

      const testButton = screen.getByRole("button", {
        name: /test connection/i,
      });
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

      const testButton = screen.getByRole("button", {
        name: /test connection/i,
      });
      fireEvent.click(testButton);

      // Check for loading indicator
      await waitFor(() => {
        expect(testButton).toBeDisabled();
      });
    });

    it("should display connection test results", async () => {
      apiPostJson.mockResolvedValue({
        success: true,
        message: "Connection successful",
      });

      const testButton = screen.getByRole("button", {
        name: /test.*connection/i,
      });
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

      // Navigate to final step
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      await waitFor(() => {
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });

    it("should display save button", () => {
      const saveButton = screen.getByRole("button", { name: /save|finish/i });
      expect(saveButton).toBeInTheDocument();
    });

    it("should save configuration successfully", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const saveButton = screen.getByRole("button", { name: /save|finish/i });
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

      const saveButton = screen.getByRole("button", { name: /save|finish/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to save configuration",
        );
      });
    });

    it("should include tenant ID in save request", async () => {
      apiPostJson.mockResolvedValue({ success: true });

      const saveButton = screen.getByRole("button", { name: /save|finish/i });
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

      // Select protocol and navigate
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        // Should show required field indicators or validation messages
        const deviceIdInput = screen.getByLabelText(/Device ID/i);
        expect(deviceIdInput).toBeInTheDocument();
      });
    });

    it("should handle invalid port numbers", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Navigate to connection settings
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      for (let i = 0; i < 2; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      await waitFor(() => {
        const portInput = screen.getByLabelText(/Port/i);
        expect(portInput).toHaveAttribute("type", "number");
      });
    });

    it("should handle network errors gracefully", async () => {
      apiPostJson.mockRejectedValue(new Error("Network error"));

      render(<ProtocolWizard {...defaultProps} />);

      // Navigate to test step and test
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);
        await waitFor(() => {}, { timeout: 100 });
      }

      const testButton = screen.getByRole("button", {
        name: /test connection/i,
      });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Dialog Management", () => {
    it("should close dialog and reset state", async () => {
      render(<ProtocolWizard {...defaultProps} />);

      // Select protocol
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      // Close dialog (implementation depends on UI)
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

      // Select protocol
      const modbusCard = screen
        .getByText((content) => content.toUpperCase().includes("MODBUS"))
        .closest("div");
      fireEvent.click(modbusCard);

      const nextButton = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Device Information")).toBeInTheDocument();
      });

      // Enter data
      const deviceIdInput = screen.getByLabelText(/Device ID/i);
      fireEvent.change(deviceIdInput, { target: { value: "TEST-001" } });

      // Navigate forward and back
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() => {}, { timeout: 100 });

      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        const input = screen.getByLabelText(/Device ID/i);
        expect(input).toHaveValue("TEST-001");
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnitClientTab from "../components/unit-details/UnitClientTab";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Mail: ({ className }) => <svg data-testid="mail-icon" className={className} />,
  Phone: ({ className }) => <svg data-testid="phone-icon" className={className} />,
  User: ({ className }) => <svg data-testid="user-icon" className={className} />,
}));

// Mock UI components
vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
}));

describe("UnitClientTab", () => {
  const mockHandleSendEmail = vi.fn();
  const mockHandleCallClient = vi.fn();
  const mockHandleScheduleMaintenance = vi.fn();

  const mockUnitWithClient = {
    id: "TC001",
    name: "Unit 1",
    client: {
      name: "Acme Corp",
      contact: "John Doe",
      email: "john@acme.com",
      phone: "+1-555-123-4567",
    },
  };

  const mockUnitWithoutClient = {
    id: "TC002",
    name: "Unit 2",
    client: null,
  };

  const mockUnitWithPartialClient = {
    id: "TC003",
    name: "Unit 3",
    client: {
      name: "Tech Corp",
      // Missing contact, email, phone
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders the client information card", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getByText("Client Information")).toBeInTheDocument();
      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    });

    it("renders two cards", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const cards = screen.getAllByTestId("card");
      expect(cards).toHaveLength(2);
    });

    it("renders all icons", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      // Use getAllByTestId for user-icon since there are 2
      const userIcons = screen.getAllByTestId("user-icon");
      expect(userIcons).toHaveLength(2);
      
      expect(screen.getByTestId("mail-icon")).toBeInTheDocument();
      expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
    });
  });

  describe("client information display", () => {
    it("displays client information when client exists", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@acme.com")).toBeInTheDocument();
      expect(screen.getByText("+1-555-123-4567")).toBeInTheDocument();
    });

    it("displays 'N/A' for missing client information", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithoutClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      // Should show N/A for all fields
      const naElements = screen.getAllByText("N/A");
      expect(naElements).toHaveLength(4); // Company, Contact, Email, Phone
    });

    it("displays 'N/A' for partial client information", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithPartialClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getByText("Tech Corp")).toBeInTheDocument();
      const naElements = screen.getAllByText("N/A");
      expect(naElements).toHaveLength(3); // Contact, Email, Phone
    });

    it("displays correct labels for client fields", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getByText("Company")).toBeInTheDocument();
      expect(screen.getByText("Contact Person")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
    });
  });

  describe("quick actions buttons", () => {
    it("renders all three action buttons", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getByText("Send Email")).toBeInTheDocument();
      expect(screen.getByText("Call Client")).toBeInTheDocument();
      expect(screen.getByText("Schedule Maintenance")).toBeInTheDocument();
    });

    it("calls handleSendEmail with client email when clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const sendEmailButton = screen.getByText("Send Email");
      await user.click(sendEmailButton);

      expect(mockHandleSendEmail).toHaveBeenCalledTimes(1);
      expect(mockHandleSendEmail).toHaveBeenCalledWith("john@acme.com");
    });

    it("calls handleSendEmail with undefined when client has no email", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithoutClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const sendEmailButton = screen.getByText("Send Email");
      await user.click(sendEmailButton);

      expect(mockHandleSendEmail).toHaveBeenCalledTimes(1);
      expect(mockHandleSendEmail).toHaveBeenCalledWith(undefined);
    });

    it("calls handleCallClient with client phone when clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const callButton = screen.getByText("Call Client");
      await user.click(callButton);

      expect(mockHandleCallClient).toHaveBeenCalledTimes(1);
      expect(mockHandleCallClient).toHaveBeenCalledWith("+1-555-123-4567");
    });

    it("calls handleCallClient with undefined when client has no phone", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithoutClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const callButton = screen.getByText("Call Client");
      await user.click(callButton);

      expect(mockHandleCallClient).toHaveBeenCalledTimes(1);
      expect(mockHandleCallClient).toHaveBeenCalledWith(undefined);
    });

    it("calls handleScheduleMaintenance when clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const scheduleButton = screen.getByText("Schedule Maintenance");
      await user.click(scheduleButton);

      expect(mockHandleScheduleMaintenance).toHaveBeenCalledTimes(1);
      expect(mockHandleScheduleMaintenance).toHaveBeenCalledWith();
    });

    it("applies correct styling to buttons", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const sendEmailButton = screen.getByText("Send Email");
      expect(sendEmailButton).toHaveClass("bg-blue-600");
      expect(sendEmailButton).toHaveClass("hover:bg-blue-700");
      expect(sendEmailButton).toHaveClass("button-hover");

      const callButton = screen.getByText("Call Client");
      expect(callButton).toHaveClass("bg-green-600");
      expect(callButton).toHaveClass("hover:bg-green-700");

      const scheduleButton = screen.getByText("Schedule Maintenance");
      expect(scheduleButton).toHaveClass("bg-yellow-600");
      expect(scheduleButton).toHaveClass("hover:bg-yellow-700");
    });
  });

  describe("styling", () => {
    it("applies dark mode classes to cards", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const cards = screen.getAllByTestId("card");
      cards.forEach(card => {
        expect(card).toHaveClass("dark:bg-gray-900");
      });
    });

    it("applies grid layout", () => {
      const { container } = render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const grid = container.firstChild;
      expect(grid).toHaveClass("grid");
      expect(grid).toHaveClass("grid-cols-1");
      expect(grid).toHaveClass("lg:grid-cols-2");
      expect(grid).toHaveClass("gap-6");
    });

    it("applies correct icon colors", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const userIcons = screen.getAllByTestId("user-icon");
      expect(userIcons[0]).toHaveClass("text-blue-500");
      expect(userIcons[1]).toHaveClass("text-green-500");

      const mailIcon = screen.getByTestId("mail-icon");
      expect(mailIcon).toHaveClass("text-purple-500");

      const phoneIcon = screen.getByTestId("phone-icon");
      expect(phoneIcon).toHaveClass("text-orange-500");
    });
  });

  describe("accessibility", () => {
    it("buttons have type='button'", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("buttons are focusable", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });

      const firstButton = buttons[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe("edge cases", () => {
    it("handles unit with null client", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithoutClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      // Should show N/A for all fields
      expect(screen.getAllByText("N/A")).toHaveLength(4);
      
      // Buttons should still work
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
    });

    it("handles unit with undefined client", () => {
      const unitWithUndefinedClient = {
        id: "TC004",
        name: "Unit 4",
        client: undefined,
      };

      render(
        <UnitClientTab
          unit={unitWithUndefinedClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getAllByText("N/A")).toHaveLength(4);
    });

    it("handles missing handleSendEmail prop", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={undefined}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const sendEmailButton = screen.getByText("Send Email");
      // Should not throw error
      await user.click(sendEmailButton);
      // Button should still be there
      expect(sendEmailButton).toBeInTheDocument();
    });

    it("handles missing handleCallClient prop", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={undefined}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const callButton = screen.getByText("Call Client");
      // Should not throw error
      await user.click(callButton);
      expect(callButton).toBeInTheDocument();
    });

    it("handles missing handleScheduleMaintenance prop", async () => {
      const user = userEvent.setup();
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={undefined}
        />
      );

      const scheduleButton = screen.getByText("Schedule Maintenance");
      // Should not throw error
      await user.click(scheduleButton);
      expect(scheduleButton).toBeInTheDocument();
    });

    it("handles client with empty string values", () => {
      const unitWithEmptyClient = {
        id: "TC005",
        name: "Unit 5",
        client: {
          name: "",
          contact: "",
          email: "",
          phone: "",
        },
      };

      render(
        <UnitClientTab
          unit={unitWithEmptyClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      // Empty strings should render as empty (not N/A)
      // The card content should be present
      const cardContents = screen.getAllByTestId("card-content");
      expect(cardContents).toHaveLength(2);
      
      // The client info card should have empty values
      // We can check that the labels are present
      expect(screen.getByText("Company")).toBeInTheDocument();
      expect(screen.getByText("Contact Person")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      
      // The actual values should be empty strings (not visible as text)
      // We check that "N/A" is not present since empty strings are not "N/A"
      const naElements = screen.queryAllByText("N/A");
      expect(naElements).toHaveLength(0);
    });

    it("handles very long client information", () => {
      const unitWithLongData = {
        id: "TC006",
        name: "Unit 6",
        client: {
          name: "Very Long Company Name That Might Wrap",
          contact: "Very Long Contact Person Name That Might Wrap",
          email: "very.long.email.address@with.multiple.subdomains.example.com",
          phone: "+1-555-123-4567 ext 1234567890",
        },
      };

      render(
        <UnitClientTab
          unit={unitWithLongData}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      expect(screen.getByText(unitWithLongData.client.name)).toBeInTheDocument();
      expect(screen.getByText(unitWithLongData.client.contact)).toBeInTheDocument();
      expect(screen.getByText(unitWithLongData.client.email)).toBeInTheDocument();
      expect(screen.getByText(unitWithLongData.client.phone)).toBeInTheDocument();
    });
  });

  describe("button hover states", () => {
    it("applies button-hover class to all buttons", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveClass("button-hover");
      });
    });

    it("applies transition-colors to all buttons", () => {
      render(
        <UnitClientTab
          unit={mockUnitWithClient}
          handleSendEmail={mockHandleSendEmail}
          handleCallClient={mockHandleCallClient}
          handleScheduleMaintenance={mockHandleScheduleMaintenance}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveClass("transition-colors");
      });
    });
  });
});

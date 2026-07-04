import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../../components/ui/input-otp";

// Mock the input-otp library to avoid DOMRect/undefined errors
vi.mock("input-otp", () => ({
  OTPInput: ({ children, className, containerClassName, ...props }) => (
    <div 
      data-slot="input-otp" 
      className={className} 
      data-container-class={containerClassName}
      {...props}
    >
      {children}
    </div>
  ),
  OTPInputContext: {
    Provider: ({ children, value }) => (
      <div data-testid="otp-context-provider" data-value={JSON.stringify(value)}>
        {children}
      </div>
    ),
    Consumer: ({ children }) => children({ slots: [] }),
  },
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  MinusIcon: () => <span data-testid="minus-icon">−</span>,
}));

describe("InputOTP Components", () => {
  beforeAll(() => {
    // ResizeObserver is already mocked in setupTests.js, but keep for safety
    if (!global.ResizeObserver) {
      global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  it("renders InputOTP", () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>,
    );
    
    // Check using the mocked component
    const otpElements = container.querySelectorAll('[data-slot="input-otp"]');
    expect(otpElements.length).toBeGreaterThan(0);
    
    // Also check using getAllByTestId if the mock adds it
    const groupElements = container.querySelectorAll('[data-slot="input-otp-group"]');
    expect(groupElements.length).toBeGreaterThan(0);
  });

  it("renders InputOTPGroup", () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>,
    );
    
    const groupElements = container.querySelectorAll('[data-slot="input-otp-group"]');
    expect(groupElements.length).toBeGreaterThan(0);
  });

  it("renders InputOTPSeparator", () => {
    const { container } = render(<InputOTPSeparator />);
    
    const separatorElements = container.querySelectorAll('[data-slot="input-otp-separator"]');
    expect(separatorElements.length).toBeGreaterThan(0);
    
    // Check that the MinusIcon is rendered
    const minusIconElements = screen.getAllByTestId("minus-icon");
    expect(minusIconElements.length).toBeGreaterThan(0);
  });
});

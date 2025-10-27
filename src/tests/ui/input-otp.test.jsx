import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../../components/ui/input-otp";

describe("InputOTP Components", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("renders InputOTP", () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(
      container.querySelector('[data-slot="input-otp"]'),
    ).toBeInTheDocument();
  });

  it("renders InputOTPGroup", () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(
      container.querySelector('[data-slot="input-otp-group"]'),
    ).toBeInTheDocument();
  });

  it("renders InputOTPSeparator", () => {
    const { container } = render(<InputOTPSeparator />);
    expect(
      container.querySelector('[data-slot="input-otp-separator"]'),
    ).toBeInTheDocument();
  });
});

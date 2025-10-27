import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../../components/ui/input-otp";

describe("InputOTP Components", () => {
  it("renders InputOTP", () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    );
    expect(container.querySelector('[data-slot="input-otp"]')).toBeInTheDocument();
  });

  it("renders InputOTPGroup", () => {
    const { container } = render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    );
    expect(container.querySelector('[data-slot="input-otp-group"]')).toBeInTheDocument();
  });

  it("renders InputOTPSeparator", () => {
    const { container } = render(<InputOTPSeparator />);
    expect(container.querySelector('[data-slot="input-otp-separator"]')).toBeInTheDocument();
  });
});

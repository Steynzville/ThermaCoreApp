import { render } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Slider } from "../../components/ui/slider";

// Mock the cn utility from @/lib/utils
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(' '),
}));

describe("Slider", () => {
  beforeAll(() => {
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock PointerEvent if not available
    if (!window.PointerEvent) {
      window.PointerEvent = class PointerEvent extends Event {
        constructor(type, params = {}) {
          super(type, params);
          this.pointerId = params.pointerId || 1;
          this.clientX = params.clientX || 0;
          this.clientY = params.clientY || 0;
        }
      };
    }

    // Mock DOMRect for getBoundingClientRect
    if (!window.DOMRect) {
      window.DOMRect = class DOMRect {
        constructor(x = 0, y = 0, width = 0, height = 0) {
          this.x = x;
          this.y = y;
          this.width = width;
          this.height = height;
          this.top = y;
          this.left = x;
          this.bottom = y + height;
          this.right = x + width;
        }
        toJSON() {
          return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            top: this.top,
            left: this.left,
            bottom: this.bottom,
            right: this.right,
          };
        }
      };
    }

    // Mock the entire Radix UI slider module to avoid DOM API issues
    // This is the key fix - we mock the Radix UI primitives
    vi.mock("@radix-ui/react-slider", () => ({
      Root: ({ children, className, defaultValue, value, min, max, ...props }) => (
        <div 
          data-slot="slider" 
          className={className}
          data-default-value={JSON.stringify(defaultValue)}
          data-value={JSON.stringify(value)}
          data-min={min}
          data-max={max}
          {...props}
        >
          {children}
        </div>
      ),
      Track: ({ children, className, ...props }) => (
        <div data-slot="slider-track" className={className} {...props}>
          {children}
        </div>
      ),
      Range: ({ className, ...props }) => (
        <div data-slot="slider-range" className={className} {...props} />
      ),
      Thumb: ({ className, ...props }) => (
        <div data-slot="slider-thumb" className={className} {...props} />
      ),
    }));
  });

  beforeEach(() => {
    // Mock Element.prototype methods that Radix UI slider might use
    if (!Element.prototype.hasOwnProperty('scrollIntoView')) {
      Element.prototype.scrollIntoView = vi.fn();
    }
    
    // Mock getBoundingClientRect for the slider thumb
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    });
  });

  it("renders slider component", () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    // Use querySelector to find the slider
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
  });

  it("renders with custom min and max", () => {
    const { container } = render(
      <Slider min={0} max={100} defaultValue={[25]} />,
    );
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    // Verify min and max are passed correctly
    expect(slider).toHaveAttribute('data-min', '0');
    expect(slider).toHaveAttribute('data-max', '100');
  });

  it("renders with array value", () => {
    const { container } = render(<Slider value={[20, 80]} />);
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    // Verify value is passed correctly
    expect(slider).toHaveAttribute('data-value', JSON.stringify([20, 80]));
  });

  it("renders with default value when no value provided", () => {
    const { container } = render(<Slider defaultValue={[30, 70]} />);
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('data-default-value', JSON.stringify([30, 70]));
  });

  it("renders with single value", () => {
    const { container } = render(<Slider value={[42]} />);
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('data-value', JSON.stringify([42]));
  });

  it("renders with custom className", () => {
    const { container } = render(
      <Slider defaultValue={[50]} className="custom-slider-class" />
    );
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveClass('custom-slider-class');
  });

  it("renders slider track and thumb", () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    
    // Check for track
    const track = container.querySelector('[data-slot="slider-track"]');
    expect(track).toBeInTheDocument();
    
    // Check for range
    const range = container.querySelector('[data-slot="slider-range"]');
    expect(range).toBeInTheDocument();
    
    // Check for thumb
    const thumb = container.querySelector('[data-slot="slider-thumb"]');
    expect(thumb).toBeInTheDocument();
  });

  it("renders multiple thumbs for range values", () => {
    const { container } = render(<Slider value={[20, 80]} />);
    
    // Should have 2 thumbs for range
    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]');
    expect(thumbs.length).toBe(2);
  });

  it("renders correct number of thumbs based on value length", () => {
    const { container } = render(<Slider value={[10, 30, 50, 70, 90]} />);
    
    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]');
    expect(thumbs.length).toBe(5);
  });

  it("handles disabled state", () => {
    const { container } = render(<Slider defaultValue={[50]} disabled />);
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toHaveAttribute('disabled');
  });

  it("handles orientation prop", () => {
    const { container } = render(
      <Slider defaultValue={[50]} orientation="vertical" />
    );
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    // Check for vertical orientation class or attribute
    expect(slider).toHaveAttribute('orientation', 'vertical');
  });

  it("handles step prop", () => {
    const { container } = render(
      <Slider defaultValue={[50]} step={5} />
    );
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('step', '5');
  });
});

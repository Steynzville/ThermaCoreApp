/**
 * Carousel component tests
 *
 * Stack assumed: Vitest + @testing-library/react + @testing-library/jest-dom
 *   + @testing-library/user-event
 *
 * embla-carousel-react does real DOM measurement (scroll widths, resize
 * observers, etc.) that jsdom does not implement, so we mock the hook and
 * drive the fake Embla API directly from each test.
 *
 * Note: vi.mock() calls are hoisted to the top of the file by Vite/Vitest,
 * same as jest.mock() was under Jest, so the mock factory below still runs
 * before the `embla-carousel-react` import is resolved.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// ---- Mock embla-carousel-react -------------------------------------------
let listeners = {};
let mockApi;

function createMockApi(overrides = {}) {
  listeners = {};
  return {
    canScrollPrev: vi.fn(() => overrides.canScrollPrev ?? false),
    canScrollNext: vi.fn(() => overrides.canScrollNext ?? true),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: vi.fn((event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event, cb) => {
      listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
    }),
  };
}

function fireEmblaEvent(event) {
  (listeners[event] || []).forEach((cb) => cb(mockApi));
}

vi.mock("embla-carousel-react", () => {
  return {
    __esModule: true,
    default: vi.fn(() => {
      const refCallback = vi.fn();
      return [refCallback, mockApi];
    }),
  };
});

beforeEach(() => {
  mockApi = createMockApi();
});

// ---------------------------------------------------------------------------

describe("Carousel", () => {
  function setup(props = {}) {
    return render(
      <Carousel {...props}>
        <CarouselContent>
          <CarouselItem data-testid="slide-1">Slide 1</CarouselItem>
          <CarouselItem data-testid="slide-2">Slide 2</CarouselItem>
          <CarouselItem data-testid="slide-3">Slide 3</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid="prev-btn" />
        <CarouselNext data-testid="next-btn" />
      </Carousel>,
    );
  }

  it("renders all slides passed as children", () => {
    setup();
    expect(screen.getByTestId("slide-1")).toBeInTheDocument();
    expect(screen.getByTestId("slide-2")).toBeInTheDocument();
    expect(screen.getByTestId("slide-3")).toBeInTheDocument();
  });

  it("exposes region/carousel ARIA semantics on the root element", () => {
    const { container } = setup();
    const root = container.querySelector('[data-slot="carousel"]');
    expect(root).toHaveAttribute("role", "region");
    expect(root).toHaveAttribute("aria-roledescription", "carousel");
  });

  it("marks each slide with group/slide ARIA semantics", () => {
    setup();
    const slide = screen.getByTestId("slide-1");
    expect(slide).toHaveAttribute("role", "group");
    expect(slide).toHaveAttribute("aria-roledescription", "slide");
  });

  it("calls scrollNext on the Embla API when the next button is clicked", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId("next-btn"));
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("calls scrollPrev on the Embla API when the previous button is clicked", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId("prev-btn"));
    expect(mockApi.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("disables the previous button when canScrollPrev is false", () => {
    mockApi = createMockApi({ canScrollPrev: false, canScrollNext: true });
    setup();
    expect(screen.getByTestId("prev-btn")).toBeDisabled();
    expect(screen.getByTestId("next-btn")).not.toBeDisabled();
  });

  it("disables the next button when canScrollNext is false", () => {
    mockApi = createMockApi({ canScrollPrev: true, canScrollNext: false });
    setup();
    expect(screen.getByTestId("next-btn")).toBeDisabled();
    expect(screen.getByTestId("prev-btn")).not.toBeDisabled();
  });

  it("updates button disabled state when Embla fires a 'select' event", () => {
    mockApi = createMockApi({ canScrollPrev: false, canScrollNext: true });
    setup();
    expect(screen.getByTestId("prev-btn")).toBeDisabled();

    // Simulate the user scrolling to the end: prev becomes enabled, next disabled.
    mockApi.canScrollPrev.mockReturnValue(true);
    mockApi.canScrollNext.mockReturnValue(false);
    act(() => {
      fireEmblaEvent("select");
    });

    expect(screen.getByTestId("prev-btn")).not.toBeDisabled();
    expect(screen.getByTestId("next-btn")).toBeDisabled();
  });

  it("navigates with ArrowLeft/ArrowRight keys via onKeyDownCapture", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    const root = container.querySelector('[data-slot="carousel"]');
    root.focus();

    await user.keyboard("{ArrowRight}");
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);

    await user.keyboard("{ArrowLeft}");
    expect(mockApi.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("passes setApi callback with the underlying Embla API instance", () => {
    const setApi = vi.fn();
    setup({ setApi });
    expect(setApi).toHaveBeenCalledWith(mockApi);
  });

  it("supports vertical orientation by adjusting layout classes", () => {
    const { container } = render(
      <Carousel orientation="vertical">
        <CarouselContent data-testid="content">
          <CarouselItem data-testid="item">Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid="prev-btn" />
        <CarouselNext data-testid="next-btn" />
      </Carousel>,
    );
    const innerFlex = container.querySelector('[data-slot="carousel-content"] > div');
    expect(innerFlex).toHaveClass("flex-col");
    expect(screen.getByTestId("prev-btn")).toHaveClass("rotate-90");
  });

  it("throws a descriptive error when carousel subcomponents are used outside <Carousel>", () => {
    // Suppress the expected React error boundary console output for this test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CarouselContent />)).toThrow(
      "useCarousel must be used within a <Carousel />",
    );
    spy.mockRestore();
  });

  it("merges custom className onto the carousel root", () => {
    const { container } = render(
      <Carousel className="scada-panel-carousel">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(container.querySelector('[data-slot="carousel"]')).toHaveClass(
      "scada-panel-carousel",
    );
  });
});

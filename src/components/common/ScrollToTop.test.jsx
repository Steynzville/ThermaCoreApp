import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, useNavigate } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ScrollToTop, { resetPageScroll } from "./ScrollToTop";

function Screens() {
  const navigate = useNavigate();
  return (
    <>
      <ScrollToTop />
      <main data-page-scroll ref={resetPageScroll} data-testid="page">
        <Link to="/units">Units</Link>
        <Link to="/units?unit=B">Another unit</Link>
        <button type="button" onClick={() => navigate(-1)}>
          Back
        </button>
        <button type="button" onClick={() => navigate(1)}>
          Forward
        </button>
      </main>
    </>
  );
}

it("resets the actual page container and window for routes, query screens and history navigation", () => {
  const scroll = vi.spyOn(window, "scrollTo");
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Screens />
    </MemoryRouter>,
  );
  const page = screen.getByTestId("page");
  expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
  for (const name of ["Units", "Another unit", "Back", "Forward"]) {
    page.scrollTop = 900;
    page.scrollLeft = 40;
    scroll.mockClear();
    fireEvent.click(screen.getByText(name));
    expect(page.scrollTop).toBe(0);
    expect(page.scrollLeft).toBe(0);
    expect(scroll).toHaveBeenCalledExactlyOnceWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }
});

it("preserves normal scrolling on unrelated rerenders", () => {
  const view = render(
    <MemoryRouter>
      <Screens />
    </MemoryRouter>,
  );
  const page = screen.getByTestId("page");
  page.scrollTop = 500;
  view.rerender(
    <MemoryRouter>
      <Screens />
    </MemoryRouter>,
  );
  expect(page.scrollTop).toBe(500);
});

it("resets newly mounted lazy containers instantly and ignores removed refs", () => {
  const element = document.createElement("main");
  element.scrollTo = vi.fn();
  resetPageScroll(element);
  expect(element.scrollTo).toHaveBeenCalledWith({
    top: 0,
    left: 0,
    behavior: "instant",
  });
  expect(() => resetPageScroll(null)).not.toThrow();
});

it("prevents native history scroll restoration and restores its previous setting on unmount", () => {
  Object.defineProperty(window.history, "scrollRestoration", {
    value: "auto",
    configurable: true,
    writable: true,
  });
  const view = render(
    <MemoryRouter>
      <ScrollToTop />
    </MemoryRouter>,
  );
  expect(window.history.scrollRestoration).toBe("manual");
  view.unmount();
  expect(window.history.scrollRestoration).toBe("auto");
});

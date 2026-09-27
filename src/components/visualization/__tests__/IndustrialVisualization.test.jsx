import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IndustrialGauge from "../IndustrialGauge";
import MultiTimeframeTrendChart from "../MultiTimeframeTrendChart";
import ProcessFlowDiagram from "../ProcessFlowDiagram";

let canvas;
beforeEach(() => {
  canvas = Object.fromEntries(
    ["clearRect", "beginPath", "arc", "stroke", "fill", "moveTo", "lineTo"].map(
      (k) => [k, vi.fn()],
    ),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvas);
});
afterEach(() => document.documentElement.classList.remove("dark"));

describe("industrial gauges use measured values", () => {
  it.each([
    [10, "#3b82f6"],
    [50, "#22c55e"],
    [80, "#eab308"],
    [95, "#ef4444"],
  ])("renders %s and its threshold status", (value, status) => {
    render(
      <IndustrialGauge
        title="Measured heat"
        value={value}
        unit="kWth"
        animated={false}
      />,
    );
    expect(screen.getByText(`${value.toFixed(1)}kWth`)).toBeInTheDocument();
    expect(canvas.fillStyle).toBe(status);
    expect(canvas.arc).toHaveBeenCalled();
    for (const args of canvas.arc.mock.calls)
      expect(args.every(Number.isFinite)).toBe(true);
  });
  it("does not invent a value or draw a needle for unavailable telemetry", () => {
    render(<IndustrialGauge title="Heat" value={null} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(canvas.arc).not.toHaveBeenCalled();
  });
  it("updates measured values and theme without manufacturing threshold alarms", async () => {
    const { rerender, unmount } = render(
      <IndustrialGauge value={95} showThresholds={false} animated={false} />,
    );
    expect(screen.queryByText("CRITICAL")).not.toBeInTheDocument();
    rerender(
      <IndustrialGauge
        value={25}
        precision={2}
        showThresholds={false}
        animated={false}
      />,
    );
    expect(screen.getByText("25.00")).toBeInTheDocument();
    await act(async () => document.documentElement.classList.add("dark"));
    expect(canvas.fillStyle).toBeDefined();
    unmount();
  });
});

describe("process diagram interaction", () => {
  const nodes = [
    { id: "hot", label: "Useful heat", x: 100, y: 100 },
    { id: "cold", label: "Useful chill", x: 100, y: 100 },
    { id: "tank", label: "AWG" },
  ];
  it("shows actual node values/status, ignores invalid edges and supports keyboard selection", () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <ProcessFlowDiagram
        nodes={nodes}
        connections={[
          { id: "flow", from: "hot", to: "cold" },
          { from: "missing", to: "cold" },
        ]}
        liveData={{
          hot: { value: 12, unit: "kWth", status: "running" },
          cold: { status: "warning" },
          tank: { status: "critical" },
          flow: { flowRate: 2 },
        }}
        onNodeClick={onNodeClick}
      />,
    );
    expect(screen.getByText("12.0 kWth")).toBeInTheDocument();
    expect(screen.getByText("2.0 L/s")).toBeInTheDocument();
    const node = screen.getByRole("button", { name: /Useful heat/ });
    fireEvent.click(node);
    fireEvent.keyDown(node, { key: "Enter" });
    fireEvent.keyDown(node, { key: " " });
    expect(onNodeClick).toHaveBeenCalledTimes(3);
    expect(onNodeClick).toHaveBeenLastCalledWith(nodes[0]);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it("zooms, pans by mouse and touch, bounds zoom and resets the viewport", () => {
    render(<ProcessFlowDiagram nodes={nodes} />);
    const svg = screen.getByRole("img", { name: "Process Flow" }),
      area = svg.parentElement;
    const buttons = screen.getAllByRole("button");
    const zoomOut = buttons[0],
      zoomIn = buttons[2];
    fireEvent.click(zoomIn);
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.mouseDown(area, { button: 0, clientX: 10, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 30, clientY: 50 });
    fireEvent.mouseUp(window);
    expect(svg.style.transform).toContain("translate(20px, 30px)");
    fireEvent.touchStart(area, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 100, clientY: 0 },
      ],
    });
    fireEvent.touchMove(area, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 200, clientY: 0 },
      ],
    });
    fireEvent.touchEnd(area);
    expect(screen.getByText("250%")).toBeInTheDocument();
    fireEvent.touchStart(area, { touches: [{ clientX: 5, clientY: 5 }] });
    fireEvent.touchMove(area, { touches: [{ clientX: 15, clientY: 25 }] });
    fireEvent.touchEnd(area);
    expect(svg.style.transform).toContain("translate(30px, 50px)");
    for (let n = 0; n < 10; n++) fireEvent.click(zoomIn);
    expect(zoomIn).toBeDisabled();
    for (let n = 0; n < 12; n++) fireEvent.click(zoomOut);
    expect(zoomOut).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(svg.style.transform).toBe("translate(0px, 0px) scale(1)");
  });
});

describe("measured multi-timeframe trends", () => {
  const metrics = [
    { dataKey: "heat", label: "Heat (kWth)" },
    { dataKey: "water", label: "Water (L/h)", type: "bar" },
  ];
  const data = [
    { timestamp: "2026-09-01T00:00:00Z", heat: 10, water: 8 },
    { timestamp: "2026-09-01T01:00:00Z", heat: 20, water: 4 },
  ];
  it("switches metric, chart type and period and exports the measured statistics", async () => {
    const user = userEvent.setup(),
      onExport = vi.fn(),
      onTimeframeChange = vi.fn();
    render(
      <MultiTimeframeTrendChart
        data={data}
        metrics={metrics}
        onExport={onExport}
        onTimeframeChange={onTimeframeChange}
      />,
    );
    expect(screen.getByText("20.0")).toBeInTheDocument();
    expect(screen.getByText(/100.0%/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Trend metric"), "water");
    expect(screen.getByText("4.0")).toBeInTheDocument();
    expect(screen.getByText(/50.0%/)).toBeInTheDocument();
    for (const name of ["Area", "Bar", "Combined", "Line"]) {
      await user.click(screen.getByRole("tab", { name }));
      expect(screen.getByRole("tab", { name })).toHaveAttribute(
        "data-state",
        "active",
      );
    }
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByRole("option", { name: "Last 7 Days" }));
    expect(onTimeframeChange).toHaveBeenCalledWith("7d");
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(onExport).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining(data[0])]),
      expect.objectContaining({
        heat: { min: 10, max: 20, avg: 15, current: 20, trend: 100 },
        water: { min: 4, max: 8, avg: 6, current: 4, trend: -50 },
      }),
    );
  });
  it("downloads CSV with escaped values and keeps empty history empty", async () => {
    const create = vi.fn(() => "blob:trend"),
      revoke = vi.fn();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const { rerender } = render(
      <MultiTimeframeTrendChart
        data={[{ timestamp: "2026-09-01", heat: 'quoted,"value"\nnext' }]}
        metrics={metrics}
        defaultTimeframe="30d"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    const csv = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(create.mock.calls[0][0]);
    });
    expect(csv).toContain("timestamp,time,heat,water");
    expect(csv).toContain('"quoted,""value""\nnext"');
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith("blob:trend");
    rerender(
      <MultiTimeframeTrendChart
        data={[]}
        metrics={metrics}
        defaultTimeframe="1h"
      />,
    );
    expect(
      screen.getByText(/0 data points over last hour/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(create.mock.calls[1][0].size).toBe(0);
    vi.unstubAllGlobals();
  });
});

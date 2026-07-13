import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import PowerIcon3D from "./PowerIcon3D";

describe("PowerIcon3D", () => {
  it("should render grey/inactive colors when power is 0", () => {
    const { container } = render(<PowerIcon3D power={0} />);

    // Check SVG has grey color
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("text-gray-400", "dark:text-gray-600");

    // Check power badge text
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();

    // No pulse indicator or glow should be rendered
    const pulseEffect = container.querySelector(".animate-pulse");
    expect(pulseEffect).toBeNull();

    // No ping animation
    const pingEffect = container.querySelector(".animate-ping");
    expect(pingEffect).toBeNull();
  });

  it("should render green active colors and animation effects when power > 0", () => {
    const { container } = render(<PowerIcon3D power={120} />);

    // Check SVG has green color
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-green-500", "dark:text-green-400");

    // Check power badge text
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();

    // Pulse effect must be active
    const pulseEffect = container.querySelector(".animate-pulse");
    expect(pulseEffect).toBeInTheDocument();

    // Ping animation for online units should be present
    const pingEffect = container.querySelector(".animate-ping");
    expect(pingEffect).toBeInTheDocument();
  });

  it("should apply customized className", () => {
    const { container } = render(<PowerIcon3D power={50} className="custom-3d-layout" />);
    expect(container.firstChild).toHaveClass("custom-3d-layout");
  });

  it("should render with positive power value", () => {
    render(<PowerIcon3D power={75} />);
    
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();
  });

  it("should render with negative power value", () => {
    render(<PowerIcon3D power={-25} />);
    
    expect(screen.getByText("-25")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();
  });

  it("should render with decimal power value", () => {
    render(<PowerIcon3D power={42.5} />);
    
    expect(screen.getByText("42.5")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();
  });

  it("should have grey icon when power is 0", () => {
    const { container } = render(<PowerIcon3D power={0} />);
    
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-gray-400");
    expect(svg).not.toHaveClass("text-green-500");
  });

  it("should have green icon when power is positive", () => {
    const { container } = render(<PowerIcon3D power={100} />);
    
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-green-500");
    expect(svg).not.toHaveClass("text-gray-400");
  });

  it("should render with dark mode classes", () => {
    const { container } = render(<PowerIcon3D power={0} />);
    
    const bgElement = container.querySelector(".bg-gray-100.dark\\:bg-gray-800");
    expect(bgElement).toBeInTheDocument();
  });

  it("should render with dark mode classes when power > 0", () => {
    const { container } = render(<PowerIcon3D power={100} />);
    
    const bgElement = container.querySelector(".bg-green-50.dark\\:bg-green-900");
    expect(bgElement).toBeInTheDocument();
  });

  it("should render with border colors correctly", () => {
    const { container } = render(<PowerIcon3D power={0} />);
    
    const borderElement = container.querySelector(".border-gray-200.dark\\:border-gray-700");
    expect(borderElement).toBeInTheDocument();
  });

  it("should render with green border when power > 0", () => {
    const { container } = render(<PowerIcon3D power={100} />);
    
    const borderElement = container.querySelector(".border-green-700.dark\\:border-lime-400");
    expect(borderElement).toBeInTheDocument();
  });

  it("should have hover effects on container", () => {
    const { container } = render(<PowerIcon3D power={50} />);
    
    const mainIcon = container.querySelector(".hover\\:scale-100");
    expect(mainIcon).toBeInTheDocument();
  });

  it("should have hover effects on badge", () => {
    const { container } = render(<PowerIcon3D power={50} />);
    
    const badge = container.querySelector(".hover\\:scale-105");
    expect(badge).toBeInTheDocument();
  });

  it("should render with correct aspect ratio", () => {
    const { container } = render(<PowerIcon3D power={50} />);
    
    const iconContainer = container.querySelector(".w-14.h-14");
    expect(iconContainer).toBeInTheDocument();
  });

  it("should render kW label with correct font size", () => {
    render(<PowerIcon3D power={80} />);
    
    const kwElement = screen.getByText("kW");
    expect(kwElement).toBeInTheDocument();
    expect(kwElement).toHaveClass("text-[10px]", "font-medium");
  });
});

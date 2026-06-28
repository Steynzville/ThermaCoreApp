/**
 * Industrial Gauge Component
 *
 * High-performance canvas-based gauge for real-time industrial monitoring
 * with configurable ranges, thresholds, and visual alerts.
 */

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const IndustrialGauge = ({
  title = "Gauge",
  value = 0,
  min = 0,
  max = 100,
  unit = "",
  thresholds = {
    low: 30,
    normal: 70,
    high: 90,
  },
  size = 180,
  showValue = true,
  showThresholds = true,
  animated = true,
  precision = 1,
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const currentValueRef = useRef(min);
  const [status, setStatus] = useState("normal");
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Determine status based on thresholds
  useEffect(() => {
    if (value >= thresholds.high) {
      setStatus("critical");
    } else if (value >= thresholds.normal) {
      setStatus("warning");
    } else if (value < thresholds.low) {
      setStatus("low");
    } else {
      setStatus("normal");
    }
  }, [value, thresholds]);

  // Draw gauge on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;
    const lineWidth = 15;

    // Normalize value to 0-1 range
    const normalizedValue = Math.max(
      0,
      Math.min(1, (currentValueRef.current - min) / (max - min)),
    );

    const startAngle = 0.75 * Math.PI; // Start at 7:30 position
    const endAngle = 2.25 * Math.PI; // End at 4:30 position
    const totalAngle = endAngle - startAngle;
    const valueAngle = startAngle + totalAngle * normalizedValue;

    const draw = () => {
      // Clear canvas
      if (ctx) {
        ctx.clearRect(0, 0, size, size);
      }

      // Theme-aware colors
      const bgArcColor = isDark ? "#374151" : "#e5e7eb"; // gray-700 : gray-200
      const centerBgColor = isDark ? "#1f2937" : "#f9fafb"; // gray-800 : gray-50
      const centerBorderColor = isDark ? "#4b5563" : "#d1d5db"; // gray-600 : gray-300
      const needleColor = isDark ? "#d1d5db" : "#374151"; // gray-300 : gray-700

      // Draw background arc
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = bgArcColor;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw threshold zones if enabled
      if (showThresholds) {
        // Low zone (blue)
        const lowAngle =
          startAngle + totalAngle * ((thresholds.low - min) / (max - min));
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, lowAngle);
        ctx.lineWidth = lineWidth - 2;
        ctx.strokeStyle = "rgba(59, 130, 246, 0.3)"; // blue
        ctx.stroke();

        // Normal zone (green)
        const normalAngle =
          startAngle + totalAngle * ((thresholds.normal - min) / (max - min));
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, lowAngle, normalAngle);
        ctx.strokeStyle = "rgba(34, 197, 94, 0.3)"; // green
        ctx.stroke();

        // High zone (yellow/red)
        const highAngle =
          startAngle + totalAngle * ((thresholds.high - min) / (max - min));
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, normalAngle, highAngle);
        ctx.strokeStyle = "rgba(234, 179, 8, 0.3)"; // yellow
        ctx.stroke();

        // Critical zone (red)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, highAngle, endAngle);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.3)"; // red
        ctx.stroke();
      }

      // Draw value arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
      ctx.lineWidth = lineWidth;

      // Color based on status
      const colors = {
        low: "#3b82f6", // blue
        normal: "#22c55e", // green
        warning: "#eab308", // yellow
        critical: "#ef4444", // red
      };
      ctx.strokeStyle = colors[status] || colors.normal;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 40, 0, 2 * Math.PI);
      ctx.fillStyle = centerBgColor;
      ctx.fill();
      ctx.strokeStyle = centerBorderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw needle
      const needleLength = radius - 35;
      const needleAngle = valueAngle;
      const needleX = centerX + needleLength * Math.cos(needleAngle);
      const needleY = centerY + needleLength * Math.sin(needleAngle);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(needleX, needleY);
      ctx.lineWidth = 3;
      ctx.strokeStyle = needleColor;
      ctx.stroke();

      // Draw center dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = colors[status] || colors.normal;
      ctx.fill();
    };

    // Animation logic
    const animate = () => {
      const targetValue = value;
      const diff = targetValue - currentValueRef.current;

      if (animated && Math.abs(diff) > 0.01) {
        currentValueRef.current += diff * 0.1;
        draw();
        animationRef.current = requestAnimationFrame(animate);
      } else {
        currentValueRef.current = targetValue;
        draw();
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    value,
    min,
    max,
    size,
    status,
    thresholds,
    showThresholds,
    animated,
    isDark,
  ]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground">
            {title}
          </CardTitle>
          {status === "critical" && (
            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-4">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="mb-2 max-w-full h-auto"
        />
        {showValue && (
          <div className="text-center w-full px-2">
            <div className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white break-words">
              {value.toFixed(precision)}
              {unit}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground dark:text-gray-300 mt-1">
              Range: {min}
              {unit} - {max}
              {unit}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IndustrialGauge;

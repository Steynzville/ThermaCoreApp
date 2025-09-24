import React from "react";
import { cn } from "@/lib/utils";

const Spinner = ({ className, size = "md", ...props }) => {
  const sizeClasses = {
    sm: { width: "50", height: "50", outerRadius: "20", innerRadius: "15" },
    md: { width: "75", height: "75", outerRadius: "30", innerRadius: "20" },
    lg: { width: "100", height: "100", outerRadius: "35", innerRadius: "25" },
    xl: { width: "120", height: "120", outerRadius: "45", innerRadius: "35" },
  };

  const { width, height, outerRadius, innerRadius } = sizeClasses[size];
  const centerX = parseInt(width) / 2;
  const centerY = parseInt(height) / 2;

  return (
    <div className={cn("inline-block", className)} {...props}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id="neonBlueGlow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Golden outer ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="none"
          stroke="#ffd700"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="55 200"
          filter="url(#subtleGlow)"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values={`0 ${centerX} ${centerY};360 ${centerX} ${centerY}`}
            dur="1.2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Blue inner ring - 3 bars evenly spaced */}
        <g>
          {/* First blue bar */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            fill="none"
            stroke="#00ccff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="18 102"
            opacity="0.9"
            filter="url(#neonBlueGlow)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`0 ${centerX} ${centerY};-360 ${centerX} ${centerY}`}
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Second blue bar */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            fill="none"
            stroke="#00ccff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="18 102"
            opacity="0.9"
            filter="url(#neonBlueGlow)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`120 ${centerX} ${centerY};-240 ${centerX} ${centerY}`}
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Third blue bar */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            fill="none"
            stroke="#00ccff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="18 102"
            opacity="0.9"
            filter="url(#neonBlueGlow)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`240 ${centerX} ${centerY};-120 ${centerX} ${centerY}`}
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill="#ffd700"
          opacity="0.8"
          filter="url(#subtleGlow)"
        >
          <animate
            attributeName="opacity"
            values="0.8;0.4;0.8"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};

export { Spinner };

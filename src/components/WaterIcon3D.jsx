import React from "react";

const WaterIcon3D = ({ waterLevel, className = "", greyedOut = false }) => {
  // Determine color based on water generation status
  const getWaterColor = (hasWater) => {
    if (greyedOut) return "text-gray-400 dark:text-gray-600";
    if (!hasWater) return "text-gray-400 dark:text-gray-600";
    return "text-blue-500 dark:text-blue-400";
  };

  const getBgColor = (hasWater) => {
    if (greyedOut) return "bg-gray-100 dark:bg-gray-800";
    if (!hasWater) return "bg-gray-100 dark:bg-gray-800";
    return "bg-blue-50 dark:bg-blue-900";
  };

  const getBorderColor = (hasWater) => {
    if (greyedOut) return "border-gray-200 dark:border-gray-700";
    if (!hasWater) return "border-gray-200 dark:border-gray-700";
    // Deep blue theme
    return "border-blue-700 dark:border-blue-400";
  };

  const hasWater = waterLevel > 0;

  return (
    <div className={`relative ${className}`}>
      {/* 3D Container with perspective - ensuring perfect square aspect ratio */}
      <div className="relative transform-gpu perspective-1000 w-14 h-14">
        {/* Main 3D Icon - Perfect Square with rounded corners */}
        <div
          className={`
            relative w-full h-full rounded-2xl
            ${getBgColor(hasWater)}
            ${getBorderColor(hasWater)}
            border-2
            transform transition-all duration-300 ease-out
            hover:scale-100
            overflow-hidden
          `}
          style={{
            aspectRatio: "1 / 1",
          }}
        >
          {/* Water droplet icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className={`w-6 h-6 ${getWaterColor(hasWater)} drop-shadow-sm`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
            </svg>
          </div>

          {/* Animated water droplets for active units */}
          {hasWater && !greyedOut && (
            <>
              {/* Droplet 1 */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                <div
                  className={`
                    w-1 h-1 rounded-full
                    ${hasWater ? "bg-blue-400" : "bg-gray-400"}
                    animate-bounce
                  `}
                  style={{
                    animationDelay: "0s",
                    animationDuration: "2s",
                  }}
                />
              </div>
              
              {/* Droplet 2 */}
              <div className="absolute top-0 left-1/3 transform -translate-x-1/2">
                <div
                  className={`
                    w-1 h-1 rounded-full
                    ${hasWater ? "bg-blue-300" : "bg-gray-400"}
                    animate-bounce
                  `}
                  style={{
                    animationDelay: "0.7s",
                    animationDuration: "2s",
                  }}
                />
              </div>
              
              {/* Droplet 3 */}
              <div className="absolute top-0 right-1/3 transform translate-x-1/2">
                <div
                  className={`
                    w-1 h-1 rounded-full
                    ${hasWater ? "bg-blue-500" : "bg-gray-400"}
                    animate-bounce
                  `}
                  style={{
                    animationDelay: "1.4s",
                    animationDuration: "2s",
                  }}
                />
              </div>
            </>
          )}

          {/* Glow effect for active units */}
          {hasWater && !greyedOut && (
            <div
              className={`
                absolute inset-0 rounded-2xl opacity-60
                ${hasWater ? "bg-blue-400" : "bg-gray-400"}
                blur-sm scale-110 -z-10
                animate-pulse
              `}
            />
          )}
        </div>

        {/* Water level badge - positioned to not break square shape */}
        <div
          className={`
            absolute -bottom-1 -right-1 min-w-[2.25rem] h-5
            ${getBgColor(hasWater)}
            ${getBorderColor(hasWater)}
            border rounded-full
            flex items-center justify-center
            shadow-md
            transform transition-all duration-300
            hover:scale-105
          `}
        >
          <span
            className={`
              text-xs font-bold
              ${getWaterColor(hasWater)}
              px-1
            `}
          >
            {waterLevel}
          </span>
          <span
            className={`
              text-[10px] font-medium
              ${getWaterColor(hasWater)}
              opacity-80
            `}
          >
            L
          </span>
        </div>
      </div>

      {/* Subtle animation for active units */}
      {hasWater && !greyedOut && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`
              absolute top-1 left-1 w-2 h-2 rounded-full
              ${hasWater ? "bg-blue-400" : "bg-gray-400"}
              opacity-70 animate-ping
            `}
          />
        </div>
      )}
    </div>
  );
};

export default WaterIcon3D;


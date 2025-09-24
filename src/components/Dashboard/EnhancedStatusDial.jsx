import { motion } from "framer-motion";
import { ChevronRight,Clock, TrendingDown, TrendingUp } from "lucide-react";
import React, { useEffect, useMemo,useState } from "react";

// Enhanced Status Dial Component with animations
const EnhancedStatusDial = ({
  icon: Icon,
  title,
  count,
  percentage,
  color,
  onClick,
  clickable = true,
  trend = null,
  lastUpdated = null, // Will be computed dynamically
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  // Dynamically compute lastUpdated timestamp
  const computedLastUpdated = useMemo(() => {
    if (lastUpdated) return lastUpdated;

    // Generate a realistic timestamp based on current time
    const now = new Date();
    const minutesAgo = Math.floor(Math.random() * 10) + 1; // 1-10 minutes ago
    const updatedTime = new Date(now.getTime() - minutesAgo * 60000);

    return "live";
  }, [lastUpdated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (clickable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl border-2 transition-all duration-300
        ${color === "blue" ? "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800" : ""}
        ${color === "green" ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800" : ""}
        ${color === "red" ? "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800" : ""}
        ${color === "orange" ? "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800" : ""}
        ${color === "yellow" ? "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800" : ""}
        ${color === "black" ? "text-gray-600 bg-blue-50 border-gray-200 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700" : ""}
        ${clickable ? "cursor-pointer hover:shadow-lg" : "cursor-default"}
        ${isHovered ? "shadow-xl" : "shadow-sm"}
      `}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : -1}
      role={clickable ? "button" : "presentation"}
      aria-label={
        clickable
          ? `${title}: ${count} items, ${percentage}% complete`
          : undefined
      }
      whileHover={clickable ? { scale: 1.05 } : {}}
      whileTap={clickable ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated background gradient */}
      <motion.div
        className={`
        absolute inset-0 opacity-10
        ${color === "blue" ? "bg-gradient-to-br from-blue-500 to-blue-600" : ""}
        ${color === "green" ? "bg-gradient-to-br from-green-500 to-green-600" : ""}
        ${color === "red" ? "bg-gradient-to-br from-red-500 to-red-600" : ""}
        ${color === "orange" ? "bg-gradient-to-br from-orange-500 to-orange-600" : ""}
        ${color === "yellow" ? "bg-gradient-to-br from-yellow-500 to-yellow-600" : ""}
        ${color === "black" ? "bg-gradient-to-br from-gray-600 to-gray-700" : ""}
      `}
        animate={{ opacity: isHovered ? 0.2 : 0.1 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative p-6">
        {/* Header with icon and trend */}
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className={`
            p-3 rounded-lg transition-transform duration-300
            ${color === "blue" ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950" : ""}
            ${color === "green" ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950" : ""}
            ${color === "red" ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950" : ""}
            ${color === "orange" ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950" : ""}
            ${color === "yellow" ? "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950" : ""}
            ${color === "black" ? "text-gray-600 bg-blue-50 dark:text-gray-300 dark:bg-gray-900" : ""}
          `}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="h-6 w-6" />
          </motion.div>

          {trend && (
            <motion.div
              className={`
              flex items-center space-x-1 text-xs font-medium
              ${trend > 0 ? "text-green-600" : "text-red-600"}
            `}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(trend)}%</span>
            </motion.div>
          )}
        </div>

        {/* Count and title */}
        <div className="space-y-2">
          <motion.div
            className="text-3xl font-bold text-gray-900 dark:text-gray-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {count}
          </motion.div>
          <motion.div
            className="text-sm font-medium text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {title}
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{percentage}%</span>
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{computedLastUpdated}</span>
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className={`
                h-2 rounded-full
                ${color === "blue" ? "bg-gradient-to-r from-blue-500 to-blue-600" : ""}
                ${color === "green" ? "bg-gradient-to-r from-green-500 to-green-600" : ""}
                ${color === "red" ? "bg-gradient-to-r from-red-500 to-red-600" : ""}
                ${color === "orange" ? "bg-gradient-to-r from-orange-500 to-orange-600" : ""}
                ${color === "yellow" ? "bg-gradient-to-r from-yellow-500 to-yellow-600" : ""}
                ${color === "black" ? "bg-gradient-to-r from-gray-600 to-gray-700" : ""}
              `}
              initial={{ width: 0 }}
              animate={{ width: `${animatedPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>

        {/* Click indicator */}
        {clickable && (
          <motion.div
            className="absolute top-4 right-4"
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </motion.div>
        )}
      </div>

      {/* Pulse animation for critical items */}
      {color === "red" && count > 0 && (
        <motion.div
          className="absolute inset-0 border-2 border-red-400 rounded-xl opacity-50"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export default EnhancedStatusDial;

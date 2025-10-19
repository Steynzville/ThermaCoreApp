import { motion } from "framer-motion";
import React, { useEffect,useState } from "react";

import { Card, CardContent } from "./ui/card";

const StatusDial = ({
  title,
  count,
  percentage,
  icon: Icon,
  color,
  clickable = false,
  onClick,
}) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      iconBg: "bg-blue-100 dark:bg-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      progressBar: "bg-blue-500",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      iconBg: "bg-green-100 dark:bg-green-800",
      icon: "text-green-600 dark:text-green-400",
      progressBar: "bg-green-500",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      iconBg: "bg-red-100 dark:bg-red-800",
      icon: "text-red-600 dark:text-red-400",
      progressBar: "bg-red-500",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      iconBg: "bg-yellow-100 dark:bg-yellow-800",
      icon: "text-yellow-600 dark:text-yellow-400",
      progressBar: "bg-yellow-500",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      iconBg: "bg-orange-100 dark:bg-orange-800",
      icon: "text-orange-600 dark:text-orange-400",
      progressBar: "bg-orange-500",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      iconBg: "bg-purple-100 dark:bg-purple-800",
      icon: "text-purple-600 dark:text-purple-400",
      progressBar: "bg-purple-500",
    },
    default: {
      bg: "bg-blue-50 dark:bg-gray-900/20",
      border: "border-gray-200 dark:border-gray-800",
      iconBg: "bg-gray-100 dark:bg-gray-800",
      icon: "text-gray-600 dark:text-gray-400",
      progressBar: "bg-blue-500",
    },
  };

  const currentColors = colorClasses[color] || colorClasses.default;

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={`flex flex-col items-center justify-center p-4 transition-shadow ${currentColors.bg} ${currentColors.border} ${
        clickable ? "cursor-pointer hover:shadow-lg" : "cursor-default"
      }`}
      onClick={handleClick}
      {...(clickable && {
        tabIndex: 0,
        role: "button",
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        },
      })}
    >
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${currentColors.iconBg}`}
      >
        <Icon className={`w-8 h-8 ${currentColors.icon}`} />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {count}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{title}</p>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <motion.div
          className={`h-2.5 rounded-full ${currentColors.progressBar}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        ></motion.div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {percentage}% of Total
      </p>
    </Card>
  );
};

export default StatusDial;

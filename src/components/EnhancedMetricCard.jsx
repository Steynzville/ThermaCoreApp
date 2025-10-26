/**
 * Enhanced Metric Card Component with Drill-down and Tooltips
 *
 * Provides interactive metric cards with hover states, tooltips,
 * and drill-down navigation capabilities.
 */

import { TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// CardWrapper component - moved outside for performance
const CardWrapper = ({ children, tooltipContent }) => {
  if (tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return children;
};

const EnhancedMetricCard = ({
  title,
  icon: Icon,
  value,
  subValue,
  trend,
  loading,
  clickable = false,
  onClick,
  drillDownPath,
  tooltipContent,
  variant = "default",
}) => {
  const navigate = useNavigate();

  const getTrendIcon = () => {
    if (trend === "up")
      return (
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      );
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (drillDownPath) {
      navigate(drillDownPath);
    }
  };

  const cardClasses = `
    transition-all duration-200
    ${clickable ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary" : ""}
    ${variant === "success" ? "border-green-500 dark:border-green-700" : ""}
    ${variant === "warning" ? "border-yellow-500 dark:border-yellow-700" : ""}
    ${variant === "error" ? "border-destructive" : ""}
  `;

  return (
    <CardWrapper tooltipContent={tooltipContent}>
      <Card
        className={cardClasses}
        onClick={clickable ? handleClick : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold flex items-center gap-2">
                {value}
                {getTrendIcon()}
              </div>
              {subValue && (
                <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
              )}
              {clickable && (
                <p className="text-xs text-primary mt-2 font-medium">
                  Click for details →
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

export default EnhancedMetricCard;

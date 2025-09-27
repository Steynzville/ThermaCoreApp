import { AlertTriangle, CheckCircle, Clock, WifiOff, Wrench } from "lucide-react";
import React from "react";
import { Badge } from "./ui/badge";

/**
 * Device Status Indicator Component
 * Shows visual indicators for device connectivity and status
 */
const DeviceStatusIndicator = ({ 
  status = 'unknown', 
  hasAlert = false, 
  hasAlarm = false, 
  isOnline = true,
  healthStatus = 'unknown',
  size = 'sm',
  showText = false,
  className = '' 
}) => {
  
  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className={`${getIconSize()} text-red-500`} />;
    }
    
    if (hasAlarm) {
      return <AlertTriangle className={`${getIconSize()} text-red-500 animate-pulse`} />;
    }
    
    if (hasAlert) {
      return <AlertTriangle className={`${getIconSize()} text-yellow-500`} />;
    }
    
    switch (status) {
      case 'online':
        return <CheckCircle className={`${getIconSize()} text-green-500`} />;
      case 'offline':
        return <WifiOff className={`${getIconSize()} text-red-500`} />;
      case 'maintenance':
        return <Wrench className={`${getIconSize()} text-blue-500`} />;
      case 'error':
        return <AlertTriangle className={`${getIconSize()} text-red-500`} />;
      default:
        return <Clock className={`${getIconSize()} text-gray-400`} />;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'xs': return 'h-3 w-3';
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-5 w-5';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  const getStatusBadge = () => {
    if (!isOnline) {
      return <Badge variant="destructive">Offline</Badge>;
    }
    
    if (hasAlarm) {
      return <Badge variant="destructive">Alarm</Badge>;
    }
    
    if (hasAlert) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">Alert</Badge>;
    }
    
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'maintenance':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">Maintenance</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getHealthBadge = () => {
    switch (healthStatus?.toLowerCase()) {
      case 'optimal':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Optimal</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (hasAlarm) return 'Alarm Active';
    if (hasAlert) return 'Alert Active';
    
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  if (showText) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        {getStatusBadge()}
        {healthStatus && healthStatus !== 'unknown' && getHealthBadge()}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center ${className}`}
      title={`Status: ${getStatusText()}${healthStatus && healthStatus !== 'unknown' ? ` | Health: ${healthStatus}` : ''}`}
    >
      {getStatusIcon()}
    </div>
  );
};

export default DeviceStatusIndicator;
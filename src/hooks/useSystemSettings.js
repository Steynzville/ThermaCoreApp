/**
 * useSystemSettings Hook
 *
 * Manages system-wide settings like notifications, backups, and maintenance mode.
 * Extracted from AdminPanel to improve testability.
 */

import { useState } from "react";

export const useSystemSettings = () => {
  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    autoBackup: true,
    maintenanceMode: false,
  });

  const handleToggleSetting = (setting) => {
    setSystemSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  return {
    systemSettings,
    handleToggleSetting,
  };
};

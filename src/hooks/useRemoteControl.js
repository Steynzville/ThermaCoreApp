import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to manage remote control permissions and operations
 */
export const useRemoteControl = (unitId) => {
  const { isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's remote control permissions
  const fetchPermissions = async () => {
    if (!isAuthenticated) {
      setPermissions(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch permissions from backend API
      const token = localStorage.getItem('thermacore_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      const response = await fetch(`${API_BASE_URL}/remote-control/permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.status}`);
      }

      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error('Failed to fetch remote control permissions:', err);
      setError('Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Control unit power
  const controlPower = async (powerOn) => {
    if (!permissions?.has_remote_control) {
      throw new Error('Insufficient permissions for remote control');
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('thermacore_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      const response = await fetch(`${API_BASE_URL}/remote-control/units/${unitId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ power_on: powerOn })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to control power: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to control power:', err);
      setError('Failed to control power');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Control water production
  const controlWaterProduction = async (waterProductionOn) => {
    if (!permissions?.has_remote_control) {
      throw new Error('Insufficient permissions for remote control');
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('thermacore_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      const response = await fetch(`${API_BASE_URL}/remote-control/units/${unitId}/water-production`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ water_production_on: waterProductionOn })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to control water production: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to control water production:', err);
      setError('Failed to control water production');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get unit's current remote control status
  const getUnitStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('thermacore_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      
      const response = await fetch(`${API_BASE_URL}/remote-control/units/${unitId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch unit status:', err);
      setError('Failed to fetch unit status');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch permissions on mount and when authentication changes
  useEffect(() => {
    fetchPermissions();
  }, [isAuthenticated]);

  return {
    permissions,
    isLoading,
    error,
    controlPower,
    controlWaterProduction,
    getUnitStatus,
    refetchPermissions: fetchPermissions
  };
};
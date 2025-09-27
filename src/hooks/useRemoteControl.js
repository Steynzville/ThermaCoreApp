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
      // For now, use mock data based on role since backend integration is simulated
      const userRole = localStorage.getItem('thermacore_role');
      
      // Mock permissions based on role
      const mockPermissions = {
        has_remote_control: userRole === 'admin' || userRole === 'operator',
        role: userRole || 'viewer',
        permissions: {
          read_units: true,
          write_units: userRole === 'admin' || userRole === 'operator',
          remote_control: userRole === 'admin' || userRole === 'operator'
        }
      };

      setPermissions(mockPermissions);
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
      // Mock API call - in real implementation this would call the backend
      console.log(`Remote control: Setting unit ${unitId} power to ${powerOn ? 'ON' : 'OFF'}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock success response
      return {
        success: true,
        unit_id: unitId,
        power_on: powerOn,
        status: powerOn ? 'online' : 'offline',
        water_generation: powerOn ? undefined : false // Water generation turns off when power is off
      };
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
      // Mock API call - in real implementation this would call the backend
      console.log(`Remote control: Setting unit ${unitId} water production to ${waterProductionOn ? 'ON' : 'OFF'}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock success response
      return {
        success: true,
        unit_id: unitId,
        water_production_on: waterProductionOn,
        status: 'online' // Assume unit is online if controlling water production
      };
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
      // Mock API call - in real implementation this would call the backend
      console.log(`Fetching remote control status for unit ${unitId}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock status
      return {
        unit_id: unitId,
        status: 'online',
        water_generation: true,
        power_on: true,
        last_updated: new Date().toISOString()
      };
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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAllUnits,
  updateUnitGPS as serviceUpdateUnitGPS,
  updateUnitLocation as serviceUpdateUnitLocation,
  updateUnitName as serviceUpdateUnitName,
} from "../services/unitService";

const UnitContext = createContext();

export const useUnits = () => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error("useUnits must be used within a UnitProvider");
  }
  return context;
};

export const UnitProvider = ({ children }) => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial units data
  useEffect(() => {
    const loadUnits = async () => {
      try {
        setLoading(true);
        const unitsData = await getAllUnits();
        setUnits(unitsData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, []);

  // Update a specific unit's information
  const updateUnit = useCallback((unitId, updates) => {
    setUnits((prevUnits) =>
      prevUnits.map((unit) =>
        unit.id === unitId ? { ...unit, ...updates } : unit,
      ),
    );
  }, []);

  // Update unit name
  const updateUnitName = useCallback(
    async (unitId, newName) => {
      await serviceUpdateUnitName(unitId, newName);
      updateUnit(unitId, { name: newName });
    },
    [updateUnit],
  );

  // Update unit location
  const updateUnitLocation = useCallback(
    async (unitId, newLocation) => {
      await serviceUpdateUnitLocation(unitId, newLocation);
      updateUnit(unitId, { location: newLocation });
    },
    [updateUnit],
  );

  // Update unit GPS coordinates
  const updateUnitGPS = useCallback(
    async (unitId, newGPS) => {
      await serviceUpdateUnitGPS(unitId, newGPS);
      updateUnit(unitId, { gpsCoordinates: newGPS });
    },
    [updateUnit],
  );

  // Get a specific unit by ID
  const getUnit = useCallback(
    (unitId) => {
      return units.find((unit) => unit.id === unitId);
    },
    [units],
  );

  // Refresh units data
  const refreshUnits = useCallback(async () => {
    try {
      setLoading(true);
      const unitsData = await getAllUnits();
      setUnits(unitsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      units,
      loading,
      error,
      updateUnit,
      updateUnitName,
      updateUnitLocation,
      updateUnitGPS,
      getUnit,
      refreshUnits,
    }),
    [
      units,
      loading,
      error,
      updateUnit,
      updateUnitName,
      updateUnitLocation,
      updateUnitGPS,
      getUnit,
      refreshUnits,
    ],
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
};

export default UnitContext;

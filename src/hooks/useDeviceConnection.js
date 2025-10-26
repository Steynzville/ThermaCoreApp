/**
 * useDeviceConnection Hook
 *
 * Manages device connection state and remote control operations for power, water production, and auto switching.
 * Extracted from RemoteControl to improve testability.
 */

import { useState } from "react";

import playSound from "../utils/audioPlayer";

export const useDeviceConnection = (
  unit,
  controlPower,
  controlWaterProduction,
  settings,
) => {
  const [machineOn, setMachineOn] = useState(unit?.status === "online");
  const [waterProductionOn, setWaterProductionOn] = useState(
    unit?.watergeneration && unit?.waterProductionOn,
  );
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(
    unit?.autoSwitchEnabled,
  );

  // Remote control operation states
  const [powerControlLoading, setPowerControlLoading] = useState(false);
  const [waterControlLoading, setWaterControlLoading] = useState(false);

  const handleMachineToggle = async (checked) => {
    setPowerControlLoading(true);

    try {
      // Call remote control API
      await controlPower(checked);

      // Update local state only after successful remote operation
      setMachineOn(checked);

      // Play appropriate audio based on power state
      if (checked) {
        playSound("power-on.mp3", settings?.soundEnabled, settings?.volume);
      } else {
        playSound("power-off.mp3", settings?.soundEnabled, settings?.volume);
      }

      // Update unit status based on power state
      if (unit) {
        unit.status = checked ? "online" : "offline";
      }

      // When machine control is toggled to "off", water production and automatic controls should both automatically toggle to "off"
      if (!checked) {
        setWaterProductionOn(false);
        setAutoSwitchEnabled(false);
      }
    } catch (_error) {
      // Optionally show error message to user
    } finally {
      setPowerControlLoading(false);
    }
  };

  const handleWaterProductionToggle = async (checked) => {
    // Can't enable water production if machine is off
    if (checked && !machineOn) {
      return;
    }

    setWaterControlLoading(true);

    try {
      // Call remote control API
      await controlWaterProduction(checked);

      // Update local state only after successful remote operation
      setWaterProductionOn(checked);

      // Play appropriate audio based on water state
      if (checked) {
        playSound("water-on.mp3", settings?.soundEnabled, settings?.volume);
      } else {
        playSound("water-off.mp3", settings?.soundEnabled, settings?.volume);
      }

      // When machine control is toggled to "on" and water production is switched to "off", automatic control should automatically toggle to "off"
      if (machineOn && !checked) {
        setAutoSwitchEnabled(false);
      }
    } catch (_error) {
      // Optionally show error message to user
    } finally {
      setWaterControlLoading(false);
    }
  };

  const handleAutoSwitchToggle = (checked) => {
    setAutoSwitchEnabled(checked);
    playSound("cool-tones.mp3", settings?.soundEnabled, settings?.volume);
  };

  return {
    // Device state
    machineOn,
    waterProductionOn,
    autoSwitchEnabled,
    powerControlLoading,
    waterControlLoading,

    // Device actions
    handleMachineToggle,
    handleWaterProductionToggle,
    handleAutoSwitchToggle,
  };
};

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";
import { Button } from "./ui/button";
function Controls({ unit }) {
  const { controlUnit, isDemoMode } = useUnits();
  const { permissions } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [power, setPower] = useState(unit.powerSetpoint ?? 0);
  const [water, setWater] = useState(unit.waterSetpoint ?? 0);
  const machinePower = unit.machinePower ?? unit.status === "online";
  const submit = async (changes) => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await controlUnit(unit.id, changes);
      setMessage(
        isDemoMode
          ? "Demo state updated across the portfolio."
          : "Device gateway acknowledged the command. Telemetry updates separately.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">{unit.name}</h2>
      <p>
        {isDemoMode ? "Demonstration controls" : "Live device controls"} ·
        Telemetry status: {unit.status}
      </p>
      {!permissions?.canControlUnits && (
        <p>You have read-only access to this unit.</p>
      )}
      <fieldset
        disabled={pending || !permissions?.canControlUnits}
        className="space-y-4"
      >
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => submit({ machinePower: !machinePower })}>
            {machinePower ? "Turn power off" : "Turn power on"}
          </Button>
          {unit.watergeneration && (
            <Button
              disabled={!machinePower}
              variant="outline"
              onClick={() =>
                submit({ waterProductionOn: !unit.waterProductionOn })
              }
            >
              {unit.waterProductionOn
                ? "Stop water production"
                : "Start water production"}
            </Button>
          )}
          <Button
            disabled={!machinePower}
            variant="outline"
            onClick={() =>
              submit({ autoSwitchEnabled: !unit.autoSwitchEnabled })
            }
          >
            {unit.autoSwitchEnabled
              ? "Disable auto switch"
              : "Enable auto switch"}
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit({ powerSetpoint: Number(power) });
            }}
            className="space-y-2"
          >
            <label>
              Power setpoint (kW)
              <input
                aria-label="Power setpoint (kW)"
                type="number"
                min="0"
                step="0.1"
                required
                value={power}
                onChange={(e) => setPower(e.target.value)}
                className="border rounded block p-2"
              />
            </label>
            <Button type="submit" disabled={!machinePower}>
              Apply power setpoint
            </Button>
          </form>
          {unit.watergeneration && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit({ waterSetpoint: Number(water) });
              }}
              className="space-y-2"
            >
              <label>
                Water setpoint (L/h)
                <input
                  aria-label="Water setpoint (L/h)"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  className="border rounded block p-2"
                />
              </label>
              <Button
                type="submit"
                disabled={!machinePower || !unit.waterProductionOn}
              >
                Apply water setpoint
              </Button>
            </form>
          )}
        </div>
      </fieldset>
      {pending && <p role="status">Waiting for acknowledgement…</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {unit.cameraUrl ? (
        <a
          href={unit.cameraUrl}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Open configured camera feed
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">
          No camera feed configured for this unit.
        </p>
      )}
    </div>
  );
}
export default function RemoteControl({ unit: suppliedUnit }) {
  const { units, getUnit, loading, error } = useUnits();
  const [id, setId] = useState("");
  const unit = getUnit(suppliedUnit?.id ?? id);
  return (
    <div className="p-6 space-y-5">
      {!suppliedUnit && (
        <>
          <h1 className="text-2xl font-bold">Remote Control</h1>
          <label>
            Select unit{" "}
            <select
              aria-label="Select unit"
              value={unit?.id || ""}
              onChange={(e) => setId(e.target.value)}
              className="border rounded p-2"
            >
              <option value="">Choose a unit…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {loading && <p role="status">Loading units…</p>}
      {error && <p role="alert">{error}</p>}
      {unit ? (
        <Controls key={unit.id} unit={unit} />
      ) : (
        <p>Select a unit in your portfolio to view controls.</p>
      )}
    </div>
  );
}

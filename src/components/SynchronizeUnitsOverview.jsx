import { useState } from "react";
import { useUnits } from "../context/UnitContext";
import { Button } from "./ui/button";
export default function SynchronizeUnitsOverview() {
  const { units, loading, error, refreshUnits, isDemoMode, scopeLabel } =
    useUnits();
  const [refreshed, setRefreshed] = useState(false);
  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">Refresh Portfolio</h1>
      <p>
        {scopeLabel} · {units.length} units ·{" "}
        {isDemoMode ? "Demonstration data" : "Live API"}
      </p>
      <Button
        disabled={loading}
        onClick={async () => {
          setRefreshed(false);
          await refreshUnits();
          setRefreshed(true);
        }}
      >
        {loading ? "Refreshing…" : "Refresh units and recorded history"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {refreshed && !error && <p role="status">Portfolio refreshed.</p>}
      <p className="text-sm text-muted-foreground">
        Loads current readings and history from the configured data source.
      </p>
    </div>
  );
}

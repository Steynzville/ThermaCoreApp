import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { validateAssumptions } from "../utils/portfolioAnalytics";
const fields = {
  financial: [
    ["electricityCost", "Grid electricity avoided (AUD/kWh)"],
    ["feedInTariff", "Export tariff (AUD/kWh)"],
    ["rebate", "Self-consumption incentive (AUD/kWh)"],
    ["operatingCostMonthly", "Operating cost (AUD/month)"],
  ],
  roi: [["initialInvestment", "Installed cost (AUD)"]],
  environmental: [
    ["dieselPricePerLiter", "Diesel price (AUD/L)"],
    ["dieselLitresPerKWh", "Diesel consumption (L/kWh)"],
    ["dieselCO2KgPerLitre", "Direct combustion CO2 (kg/L)"],
    [
      "dieselDisplacementFraction",
      "Self-consumption replacing diesel (0 to 1)",
    ],
  ],
};
export default function PortfolioAssumptions({
  section,
  assumptions,
  onSave,
  onClose,
  scope = "portfolio",
}) {
  const [draft, setDraft] = useState(assumptions),
    [error, setError] = useState("");
  useEffect(() => {
    setDraft(assumptions);
    setError("");
  }, [section, assumptions]);
  return (
    <Dialog
      open={!!section}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {scope === "unit" ? "Unit assumptions" : "Portfolio assumptions"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Editable comparison assumptions for this {scope}. Confirm tariffs,
          incentives and installed cost against your own contracts.
        </p>
        {(fields[section] || []).map(([key, label]) => (
          <label key={key} className="grid gap-2 text-sm">
            {label}
            <input
              className="rounded-md border p-2 bg-background"
              type="number"
              min="0"
              max={key === "dieselDisplacementFraction" ? 1 : undefined}
              step="any"
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        {section === "environmental" && (
          <p className="text-xs text-muted-foreground">
            Diesel figures compare self-consumed electricity only; exports are
            excluded. The 0.25 L/kWh and 2.68 kg CO2/L defaults are illustrative
            assumptions, not measured fuel displacement or certified emissions
            savings.
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            onClick={() => {
              try {
                onSave(validateAssumptions(draft));
                onClose();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Save assumptions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from "react";
import {
  applicableBalances,
  appliedBalance,
  balanceLabel,
} from "../utils/operatingBalance";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

function BalanceControl({ unit, balance, disabled, isDemoMode, onApply }) {
  const { field, label, description } = balance;
  const applied = appliedBalance(unit, field);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(50);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const supported =
    isDemoMode || unit.controlCapabilities?.balanceFields?.includes(field);
  const locked = !editing || disabled || busy;
  const value = editing ? draft : applied;
  const name = `Power / ${label} Balance`;
  const confirm = async (event) => {
    event.preventDefault();
    if (submitting.current || disabled || !supported || confirmation == null)
      return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onApply({ [field]: confirmation });
      setConfirmation(null);
      setEditing(false);
    } catch (failure) {
      setError(
        failure.message ||
          "Set-point application failed. Check device state before retrying.",
      );
      setConfirmation(null);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <Card
      role="region"
      className="min-w-0 bg-white dark:bg-gray-900 mt-6"
      aria-label={name}
    >
      <CardHeader>
        <h3 className="text-lg font-semibold">{name}</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Applied: {balanceLabel(applied, label)} ·{" "}
          {editing ? "Editing pending selection" : "Locked"}
        </p>
        {editing && (
          <p className="text-sm">Pending: {balanceLabel(draft, label)}</p>
        )}
        <fieldset
          disabled={locked}
          className={`min-w-0 space-y-3 ${locked ? "opacity-50" : ""}`}
        >
          <legend className="sr-only">{name}</legend>
          <div className="flex justify-between gap-3 text-sm">
            <span>Max Power</span>
            <span className="text-right">Max {label}</span>
          </div>
          <input
            type="range"
            aria-label={name}
            aria-valuetext={balanceLabel(value, label)}
            min="0"
            max="100"
            step="1"
            value={value ?? 50}
            onChange={(event) => setDraft(Number(event.target.value))}
            className={`w-full h-11 accent-blue-600 disabled:cursor-not-allowed ${value == null ? "invisible" : ""}`}
          />
          <div className="grid grid-cols-3 gap-2">
            {[0, 50, 100].map((position) => (
              <Button
                key={position}
                type="button"
                disabled={locked}
                aria-pressed={value === position}
                variant={value === position ? "default" : "outline"}
                className="h-auto min-h-11 whitespace-normal px-2 py-2 leading-tight"
                onClick={() => setDraft(position)}
              >
                {balanceLabel(position, label)}
              </Button>
            ))}
          </div>
        </fieldset>
        {!supported && (
          <p className="text-sm">
            Operating balance control is not configured on this gateway.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {editing ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={disabled || busy || !supported}
              onClick={() => setConfirmation(draft)}
            >
              Apply Set-point
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              Discard changes
            </Button>
          </div>
        ) : (
          <Button
            className="min-h-11"
            disabled={disabled || !supported}
            onClick={() => {
              setDraft(applied ?? 50);
              setEditing(true);
              setError("");
            }}
          >
            Edit Set-point
          </Button>
        )}
        <AlertDialog
          open={confirmation != null}
          onOpenChange={(open) => {
            if (!open && !busy) setConfirmation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Change Power / {label} operating set-point?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will change the operating balance between electrical power
                generation and {description}. Are you sure you want to apply
                this setting?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={busy || disabled} onClick={confirm}>
                {busy ? "Applying…" : "Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function OperatingBalanceControls(props) {
  const [applying, setApplying] = useState(false);
  const inFlight = useRef(false);
  const apply = async (changes) => {
    if (inFlight.current)
      throw new Error("Another command is awaiting acknowledgement.");
    inFlight.current = true;
    setApplying(true);
    try {
      return await props.onApply(changes);
    } finally {
      inFlight.current = false;
      setApplying(false);
    }
  };
  return applicableBalances(props.unit).map((balance) => (
    <BalanceControl
      key={`${props.unit.id}:${balance.field}`}
      {...props}
      disabled={props.disabled || applying}
      onApply={apply}
      balance={balance}
    />
  ));
}

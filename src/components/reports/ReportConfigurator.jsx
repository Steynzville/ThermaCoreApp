import { useEffect, useRef, useState } from "react";
import { useUnits } from "../../context/UnitContext";
import { useAnalytics } from "../../context/AnalyticsContext";
import {
  createReport,
  REPORT_FORMATS,
  REPORT_SECTIONS,
} from "../../utils/reportModel";
import {
  getPortfolioHistory,
  getPortfolioEvents,
} from "../../services/unitService";
import { dateKey } from "../../utils/portfolioAnalytics";
import {
  generateReportFile,
  downloadReportFile,
} from "../../services/reportExportService";
import { Button } from "../ui/button";
import PortfolioAssumptions from "../PortfolioAssumptions";

export default function ReportConfigurator() {
  const portfolio = useUnits();
  const { units, loading, error, scopeLabel } = portfolio;
  const { assumptions, setAssumptions } = useAnalytics();
  const [selectedIds, setSelectedIds] = useState(units.map((u) => u.id));
  const today = dateKey();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [format, setFormat] = useState("");
  const [sections, setSections] = useState(Object.keys(REPORT_SECTIONS));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [editing, setEditing] = useState(null);
  const [subsetCost, setSubsetCost] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const toggle = (list, key) =>
    list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
  const subset = selectedIds.length !== units.length;
  const generate = async (event) => {
    event.preventDefault();
    setFailure("");
    setMessage("");
    setBusy(true);
    try {
      const reportAssumptions = subset
        ? {
            ...assumptions,
            operatingCostMonthly: subsetCost,
            initialInvestment: units
              .filter((u) => selectedIds.includes(u.id))
              .reduce((sum, u) => sum + (Number(u.capitalCost) || 0), 0),
          }
        : assumptions;
      let history = { records: portfolio.records, events: portfolio.events };
      if (!portfolio.isDemoMode) {
        const [records, events] = await Promise.all([
          getPortfolioHistory(units, { from, to }),
          getPortfolioEvents({ from, to }),
        ]);
        history = { records, events };
      }
      const report = createReport({
        ...portfolio,
        ...history,
        assumptions: reportAssumptions,
        selectedIds,
        from,
        to,
        format,
        sections,
      });
      const file = await generateReportFile(report);
      if (!alive.current) return;
      downloadReportFile(file);
      setMessage(`Downloaded ${file.filename}`);
    } catch (err) {
      if (alive.current)
        setFailure(
          err.message || "Report generation failed. Please try again.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <form onSubmit={generate} className="space-y-6">
      <p className="text-muted-foreground">
        {scopeLabel} ·{" "}
        {portfolio.isDemoMode ? "Demonstration data" : "Recorded telemetry"} ·
        UTC dates
      </p>
      {loading && <p role="status">Loading portfolio…</p>}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy || loading || !!error} className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="space-y-2">
            Start date (UTC)
            <input
              aria-label="Start date (UTC)"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="block border rounded p-2 w-full"
            />
          </label>
          <label className="space-y-2">
            End date (UTC)
            <input
              aria-label="End date (UTC)"
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              required
              className="block border rounded p-2 w-full"
            />
          </label>
          <label className="space-y-2">
            Report format
            <select
              aria-label="Report format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              required
              className="block border rounded p-2 w-full"
            >
              <option value="">Choose a format…</option>
              {Object.entries(REPORT_FORMATS).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h2 className="font-semibold">
              Units ({selectedIds.length} selected)
            </h2>
            <button
              type="button"
              className="underline text-sm"
              onClick={() => setSelectedIds(units.map((u) => u.id))}
            >
              Select all
            </button>
            <button
              type="button"
              className="underline text-sm"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto border rounded p-3">
            {units.map((u) => (
              <label key={u.id} className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => setSelectedIds((list) => toggle(list, u.id))}
                />
                {u.name} ({u.id})
              </label>
            ))}
            {!units.length && <p>No units assigned to this portfolio.</p>}
          </div>
        </div>
        {subset && (
          <label className="block">
            Operating cost for selected units (AUD/month)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={subsetCost}
              onChange={(e) => setSubsetCost(e.target.value)}
              className="block border rounded p-2"
            />
            <span className="text-sm text-muted-foreground">
              Enter the cost for this subset. Portfolio-wide costs are not
              automatically allocated.
            </span>
          </label>
        )}
        <div>
          <h2 className="font-semibold mb-3">Include in report</h2>
          <p className="text-sm mb-2">
            Summary, assumptions and calculation notes are always included.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(REPORT_SECTIONS).map(([key, label]) => (
              <label key={key} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={sections.includes(key)}
                  onChange={() => setSections((list) => toggle(list, key))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {["financial", "roi", "environmental"].map((section) => (
            <button
              type="button"
              className="underline text-sm"
              key={section}
              onClick={() => setEditing(section)}
            >
              Edit {section} assumptions
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Uses the same calculations and assumptions as the analytics tab.
          Missing readings and unrecorded maintenance are identified in the
          report.
        </p>
        <Button type="submit" disabled={!units.length || busy}>
          {busy ? "Creating report…" : "Generate and download report"}
        </Button>
      </fieldset>
      {failure && (
        <p role="alert" className="text-red-600">
          {failure}
        </p>
      )}
      {message && (
        <p role="status" className="text-green-700">
          {message}
        </p>
      )}
      <PortfolioAssumptions
        section={editing}
        assumptions={assumptions}
        onSave={setAssumptions}
        onClose={() => setEditing(null)}
      />
    </form>
  );
}

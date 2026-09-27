import { useEffect, useRef, useState } from "react";
import ReportConfigurator from "../components/reports/ReportConfigurator";
import PageHeader from "../components/PageHeader";
import { reportTypes } from "../constants/reportSections";
import { useUnits } from "../context/UnitContext";
import { useAuth } from "../context/AuthContext";
import { useAnalytics } from "../context/AnalyticsContext";
import {
  generatePortfolioReport,
  selectedReportUnits,
} from "../services/portfolioReportService";
import { downloadReportFile } from "../services/reportExportService";
import {
  listSchedules,
  addSchedule,
  updateSchedule,
} from "../services/reportScheduleService";
function Reports({ portfolio }) {
  const { user, backendRole } = useAuth(),
    { assumptions } = useAnalytics();
  const alive = useRef(true),
    running = useRef(false);
  const [schedules, setSchedules] = useState([]),
    [error, setError] = useState("");
  const sales = ["admin", "client_admin"].includes(backendRole);
  const sections = [
    "vitalStatistics",
    "alertsAlarms",
    "maintenance",
    "performance",
    "compliance",
    ...(sales ? ["salesRevenue"] : []),
  ];
  const types = reportTypes
    .filter((type) => sales || type.id !== "sales-revenue")
    .map((type) => ({
      ...type,
      sections: type.sections.filter((section) => sections.includes(section)),
    }));
  const units = portfolio.units;
  const clients = [
    ...new Map(
      units
        .filter((unit) => unit.clientId != null)
        .map((unit) => [
          String(unit.clientId),
          {
            id: String(unit.clientId),
            name: unit.client?.name || unit.tenantName,
            units: units.filter(
              (other) => String(other.clientId) === String(unit.clientId),
            ).length,
          },
        ]),
    ).values(),
  ];
  const generate = async (config) => {
    const file = await generatePortfolioReport(
      portfolio,
      assumptions,
      config,
      user.id,
    );
    if (alive.current) downloadReportFile(file);
  };
  useEffect(() => {
    alive.current = true;
    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const rows = await listSchedules(user.id);
        if (!alive.current) return;
        setSchedules(rows);
        for (const row of rows.filter(
          (row) =>
            row.status === "scheduled" &&
            new Date(row.scheduledAt) <= new Date(),
        )) {
          // Scope is rechecked against the current permitted portfolio at execution.
          if (
            !row.config.selectedUnits.every((id) =>
              units.some((unit) => unit.id === id),
            )
          )
            continue;
          await updateSchedule(user.id, row.id, "processing");
          try {
            await generate(row.config);
            if (alive.current)
              await updateSchedule(user.id, row.id, "completed");
          } catch (error) {
            await updateSchedule(user.id, row.id, "failed");
            setError(error.message);
          }
        }
      } catch (error) {
        if (alive.current) setError(error.message);
      } finally {
        running.current = false;
      }
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [portfolio.scopeKey]);
  const schedule = async (config, date) => {
    const selected = selectedReportUnits(units, config);
    await addSchedule(
      user.id,
      {
        ...config,
        scope: "multiple",
        selectedUnits: selected.map((unit) => unit.id),
        selectedClients: [],
      },
      date,
    );
    setSchedules(await listSchedules(user.id));
  };
  const pause = async () => {
    await Promise.all(
      schedules
        .filter((row) => row.status === "scheduled")
        .map((row) => updateSchedule(user.id, row.id, "paused")),
    );
    setSchedules(await listSchedules(user.id));
  };
  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-4 lg:p-6 xl:p-8 w-full">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Reports"
          subtitle="Generate comprehensive reports for units, clients, and portfolios"
        />
        {error && <p role="alert">{error}</p>}
        <ReportConfigurator
          allowedScopes={[
            "single",
            "multiple",
            ...(clients.length ? ["client"] : []),
            "master",
          ]}
          allowedSections={sections}
          availableReportTypes={types}
          availableUnits={units.map((unit) => ({
            ...unit,
            client: unit.client?.name || unit.tenantName,
          }))}
          dataProviders={{ units, clients, reportTypes: types }}
          onGenerate={generate}
          onSchedule={schedule}
          onPause={pause}
        />
        <p className="text-sm mt-4">
          Scheduled reports run while this page is open and signed in. No
          unattended email delivery is configured.
        </p>
        {schedules.map((row) => (
          <div key={row.id} className="border rounded p-3 mt-2">
            {new Date(row.scheduledAt).toLocaleString()} ·{" "}
            {row.config.outputFormat.toUpperCase()} · {row.status}
            {["paused", "failed"].includes(row.status) && (
              <button
                className="underline ml-3"
                onClick={async () => {
                  try {
                    await updateSchedule(user.id, row.id, "scheduled");
                    setSchedules(await listSchedules(user.id));
                  } catch (error) {
                    setError(error.message);
                  }
                }}
              >
                Resume
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export default function ReportsPage() {
  const portfolio = useUnits();
  return portfolio.loading ? (
    <p role="status">Loading portfolio…</p>
  ) : (
    <Reports key={portfolio.scopeKey} portfolio={portfolio} />
  );
}

import React from "react";
import PageHeader from "./PageHeader";
import ReportConfigurator from "./reports/ReportConfigurator";
import { reportTypes } from "../constants/reportSections";

const ReportsView = ({ className }) => {
  // Mock data for units and clients - these would typically come from an API
  const units = [
    {
      id: "TC001",
      name: "ThermaCore Unit 001",
      client: "Client A",
      location: "Site Alpha",
    },
    {
      id: "TC002",
      name: "ThermaCore Unit 002",
      client: "Client A",
      location: "Site Beta",
    },
    {
      id: "TC003",
      name: "ThermaCore Unit 003",
      client: "Client B",
      location: "Site Gamma",
    },
    {
      id: "TC004",
      name: "ThermaCore Unit 004",
      client: "Client B",
      location: "Site Delta",
    },
    {
      id: "TC005",
      name: "ThermaCore Unit 005",
      client: "Client C",
      location: "Site Epsilon",
    },
  ];

  const clients = [
    { id: "client-a", name: "Client A", units: 2 },
    { id: "client-b", name: "Client B", units: 2 },
    { id: "client-c", name: "Client C", units: 1 },
  ];

  const handleGenerateReport = async (config) => {
    console.log("Generating report with config:", config);
    // Simulate API call for report generation
    return new Promise((resolve) => {
      setTimeout(() => {
        alert("Report generated successfully! Download will begin shortly.");
        resolve();
      }, 3000);
    });
  };

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-4 lg:p-6 xl:p-8 ${className}`}
    >
      <div className="max-w-6xl mx-auto lg:ml-0 xl:ml-4">
        <PageHeader
          title="Reports"
          subtitle="Generate comprehensive PDF reports for units, clients, and portfolios"
        />
        <ReportConfigurator
          allowedScopes={["single", "multiple", "client", "master"]}
          allowedSections={[
            "vitalStatistics",
            "alertsAlarms",
            "maintenance",
            "performance",
            "compliance",
            "salesRevenue",
          ]}
          availableReportTypes={reportTypes}
          availableUnits={units}
          dataProviders={{
            units: units,
            clients: clients,
            reportTypes: reportTypes,
          }}
          onGenerate={handleGenerateReport}
          showScheduling={true}
          showPauseScheduled={true}
        />
      </div>
    </div>
  );
};

export default ReportsView;

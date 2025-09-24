import { reportTypes } from "../constants/reportSections";
import { units } from "../data/mockUnits";

const UserReportsView = ({ className }) => {
  const allowedScopes = ["single", "multiple", "master"];
  const allowedSections = [
    "vitalStatistics",
    "alertsAlarms",
    "maintenance",
    "performance",
    "compliance",
  ];

  const filteredReportTypes = reportTypes
    .filter((report) => report.name !== "Sales and Revenue Report")
    .map((report) => {
      // For the "All Sections Report", create a user-specific version that excludes salesRevenue
      if (report.id === "all-sections") {
        return {
          ...report,
          sections: allowedSections, // Use only the allowed sections for users
        };
      }
      return report;
    });

  // Mock data for clients - these would typically come from an API
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
          subtitle="Generate comprehensive PDF reports for units and systems"
        />
        <ReportConfigurator
          allowedScopes={allowedScopes}
          allowedSections={allowedSections}
          availableReportTypes={filteredReportTypes}
          availableUnits={units}
          dataProviders={{
            units: units,
            clients: clients,
            reportTypes: filteredReportTypes,
          }}
          onGenerate={handleGenerateReport}
          showScheduling={true}
          showPauseScheduled={true}
        />
      </div>
    </div>
  );
};

export default UserReportsView;

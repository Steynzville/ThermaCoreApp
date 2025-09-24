import React, { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../../lib/utils";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Users,
  Building,
  Zap,
  Droplets,
  Thermometer,
  Gauge,
  AlertTriangle,
  Wrench,
  Activity,
  Shield,
  Clock,
  Play,
  Pause,
  DollarSign,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { format } from "date-fns";
import playSound from "../../utils/audioPlayer";

const ReportConfigurator = ({
  allowedScopes = ["single", "multiple", "client", "master"],
  allowedSections = [
    "energyProduction",
    "waterProduction",
    "temperaturePressure",
    "alertsAlarms",
    "maintenance",
    "performance",
    "compliance",
    "salesRevenue",
  ],
  availableReportTypes = [],
  availableUnits = [],
  dataProviders = {
    units: [],
    clients: [],
    reportTypes: [],
  },
  onGenerate,
  showScheduling = true,
  showPauseScheduled = true,
  className = "",
}) => {
  const { settings } = useSettings();
  const [selectedReports, setSelectedReports] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    reportTypes: [],
    scope: "",
    dateRange: {
      startDate: "",
      endDate: "",
    },
    selectedUnits: [],
    selectedClients: [],
    reportSections: {
      vitalStatistics: false,
      alertsAlarms: false,
      maintenance: false,
      performance: false,
      compliance: false,
      salesRevenue: false,
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState();
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);

  // Filter report types based on allowed sections
  const filteredReportTypes = dataProviders.reportTypes.filter((type) =>
    type.sections.every((section) => allowedSections.includes(section)),
  );

  // Filter report sections based on allowed sections
  const filteredReportSections = Object.fromEntries(
    Object.entries(reportConfig.reportSections).filter(([key]) =>
      allowedSections.includes(key),
    ),
  );

  const handleReportTypeChange = (reportTypeId) => {
    const selectedType = filteredReportTypes.find(
      (type) => type.id === reportTypeId,
    );
    if (selectedType) {
      const isCurrentlySelected = selectedReports.includes(reportTypeId);
      let newSelectedReports;

      if (isCurrentlySelected) {
        // Remove from selection
        newSelectedReports = selectedReports.filter(
          (id) => id !== reportTypeId,
        );
      } else {
        // Add to selection
        newSelectedReports = [...selectedReports, reportTypeId];
      }

      setSelectedReports(newSelectedReports);

      // Update report config with all selected report types
      const newSections = { ...reportConfig.reportSections };

      // Reset all sections first
      Object.keys(newSections).forEach((key) => (newSections[key] = false));

      // Enable sections for all selected report types
      newSelectedReports.forEach((reportId) => {
        const reportType = filteredReportTypes.find(
          (type) => type.id === reportId,
        );
        if (reportType) {
          if (reportId === "all-sections") {
            allowedSections.forEach((section) => {
              newSections[section] = true;
            });
          } else {
            reportType.sections.forEach((section) => {
              if (allowedSections.includes(section)) {
                newSections[section] = true;
              }
            });
          }
        }
      });

      setReportConfig((prev) => ({
        ...prev,
        reportTypes: newSelectedReports,
        reportSections: newSections,
      }));
    }
  };

  const handleScopeChange = (scope) => {
    setReportConfig((prev) => ({
      ...prev,
      scope,
      selectedUnits: [],
      selectedClients: [],
    }));
  };

  const handleUnitSelection = (unitId, checked) => {
    setReportConfig((prev) => ({
      ...prev,
      selectedUnits: checked
        ? [...prev.selectedUnits, unitId]
        : prev.selectedUnits.filter((id) => id !== unitId),
    }));
  };

  const handleClientSelection = (clientId, checked) => {
    setReportConfig((prev) => ({
      ...prev,
      selectedClients: checked
        ? [...prev.selectedClients, clientId]
        : prev.selectedClients.filter((id) => id !== clientId),
    }));
  };

  const handleSelectAllSections = (checked) => {
    const newSections = {};
    Object.keys(reportConfig.reportSections).forEach((key) => {
      if (allowedSections.includes(key)) {
        newSections[key] = checked;
      } else {
        newSections[key] = reportConfig.reportSections[key];
      }
    });

    setReportConfig((prev) => ({
      ...prev,
      reportSections: newSections,
      reportTypes: checked ? ["all-sections"] : [],
    }));

    setSelectedReports(checked ? ["all-sections"] : []);
  };

  const handleSectionToggle = (section, checked) => {
    if (!allowedSections.includes(section)) return;

    const newSections = {
      ...reportConfig.reportSections,
      [section]: checked,
    };

    // Find matching report types based on selected sections
    const selectedSectionKeys = Object.keys(newSections).filter(
      (key) => newSections[key],
    );

    let matchingReportTypes = [];

    if (selectedSectionKeys.length > 0) {
      // Find report types that exactly match or are subsets of selected sections
      const exactMatches = filteredReportTypes.filter(
        (type) =>
          type.sections.length === selectedSectionKeys.length &&
          type.sections.every((section) =>
            selectedSectionKeys.includes(section),
          ) &&
          type.id !== "all-sections", // Exclude "all-sections" from auto-selection
      );

      const subsetMatches = filteredReportTypes.filter(
        (type) =>
          type.sections.every((section) =>
            selectedSectionKeys.includes(section),
          ) && type.id !== "all-sections",
      );

      // Combine exact matches and subset matches, prioritizing exact matches
      matchingReportTypes = [
        ...exactMatches.map((t) => t.id),
        ...subsetMatches.map((t) => t.id),
      ];
      // Remove duplicates
      matchingReportTypes = [...new Set(matchingReportTypes)];
    }

    setReportConfig((prev) => ({
      ...prev,
      reportSections: newSections,
      reportTypes: matchingReportTypes,
    }));

    setSelectedReports(matchingReportTypes);
  };

  const handleGenerateReport = async () => {
    // Play sound effect when generating report
    playSound("sky.mp3", settings.soundEnabled, settings.volume);
    
    setIsGenerating(true);

    if (onGenerate) {
      try {
        await onGenerate(reportConfig);
      } catch (error) {
        console.error("Report generation failed:", error);
      }
    } else {
      // Default behavior - simulate report generation
      setTimeout(() => {
        setIsGenerating(false);
        alert("Report generated successfully! Download will begin shortly.");
      }, 3000);
      return;
    }

    setIsGenerating(false);
  };

  const isConfigValid = () => {
    // Date range is valid if both dates are set OR both are empty (All Time)
    const hasValidDateRange =
      (reportConfig.dateRange.startDate && reportConfig.dateRange.endDate) ||
      (!reportConfig.dateRange.startDate && !reportConfig.dateRange.endDate);

    const hasSelectedSections = Object.values(reportConfig.reportSections).some(
      Boolean,
    );

    const isScopeSelected = reportConfig.scope !== "";

    const isUnitOrClientSelected =
      reportConfig.scope === "master" ||
      reportConfig.selectedUnits.length > 0 ||
      reportConfig.selectedClients.length > 0;

    return (
      isScopeSelected &&
      hasValidDateRange &&
      hasSelectedSections &&
      isUnitOrClientSelected
    );
  };

  const getSectionIcon = (section) => {
    const iconMap = {
      vitalStatistics: Activity,
      alertsAlarms: AlertTriangle,
      maintenance: Wrench,
      performance: Activity,
      compliance: Shield,
      salesRevenue: DollarSign,
    };
    return iconMap[section] || FileText;
  };

  const getSectionColor = (section) => {
    const colorMap = {
      vitalStatistics: "text-blue-600",
      alertsAlarms: "text-orange-600",
      maintenance: "text-gray-600",
      performance: "text-green-600",
      compliance: "text-purple-600",
      salesRevenue: "text-green-600",
    };
    return colorMap[section] || "text-gray-600";
  };

  const getSectionLabel = (section) => {
    const labelMap = {
      vitalStatistics: "Vital Statistics",
      alertsAlarms: "Alerts & Alarms",
      maintenance: "Maintenance",
      performance: "Performance",
      compliance: "Compliance",
      salesRevenue: "Sales and Revenue",
    };
    return labelMap[section] || section;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {availableReportTypes && availableReportTypes.length > 0 && (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader className="flex flex-row items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Report Type
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableReportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      selectedReports.includes(type.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500 shadow-lg"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                    onClick={() => {
                      handleReportTypeChange(type.id);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {type.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scope Selection */}
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center space-x-2">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Report Scope
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allowedScopes.includes("single") && (
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  reportConfig.scope === "single"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleScopeChange("single")}
              >
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Single Unit
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Report for one specific unit
                    </p>
                  </div>
                </div>
              </div>
            )}

            {allowedScopes.includes("multiple") && (
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  reportConfig.scope === "multiple"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleScopeChange("multiple")}
              >
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Multiple Units
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Report for selected units
                    </p>
                  </div>
                </div>
              </div>
            )}

            {allowedScopes.includes("client") && (
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  reportConfig.scope === "client"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleScopeChange("client")}
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Client Portfolio
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Report for client&apos;s units
                    </p>
                  </div>
                </div>
              </div>
            )}

            {allowedScopes.includes("master") && (
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  reportConfig.scope === "master"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleScopeChange("master")}
              >
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      All Units
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Report for all units
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unit Selection */}
          {(reportConfig.scope === "single" ||
            reportConfig.scope === "multiple") &&
            availableUnits &&
            availableUnits.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Select Units
                </Label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {availableUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center space-x-3 py-2"
                    >
                      <input
                        type={
                          reportConfig.scope === "single" ? "radio" : "checkbox"
                        }
                        name={
                          reportConfig.scope === "single"
                            ? "selectedUnit"
                            : undefined
                        }
                        checked={reportConfig.selectedUnits.includes(unit.id)}
                        onChange={(e) => {
                          if (reportConfig.scope === "single") {
                            setReportConfig((prev) => ({
                              ...prev,
                              selectedUnits: e.target.checked ? [unit.id] : [],
                            }));
                          } else {
                            handleUnitSelection(unit.id, e.target.checked);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {unit.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {unit.client} • {unit.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Client Selection */}
          {reportConfig.scope === "client" && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Select Clients
              </Label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {dataProviders.clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center space-x-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={reportConfig.selectedClients.includes(client.id)}
                      onChange={(e) =>
                        handleClientSelection(client.id, e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {client.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {client.units} unit(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range */}
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Date Range
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${
                      !reportConfig.dateRange.startDate &&
                      "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-gray-600 dark:text-white" />
                    {reportConfig.dateRange.startDate ? (
                      format(
                        new Date(reportConfig.dateRange.startDate),
                        "dd/MM/yyyy",
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={
                      reportConfig.dateRange.startDate
                        ? new Date(reportConfig.dateRange.startDate)
                        : undefined
                    }
                    onSelect={(date) =>
                      setReportConfig((prev) => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          startDate: date ? format(date, "yyyy-MM-dd") : "",
                        },
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                End Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${
                      !reportConfig.dateRange.endDate && "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-gray-600 dark:text-white" />
                    {reportConfig.dateRange.endDate ? (
                      format(
                        new Date(reportConfig.dateRange.endDate),
                        "dd/MM/yyyy",
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={
                      reportConfig.dateRange.endDate
                        ? new Date(reportConfig.dateRange.endDate)
                        : undefined
                    }
                    onSelect={(date) =>
                      setReportConfig((prev) => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          endDate: date ? format(date, "yyyy-MM-dd") : "",
                        },
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() =>
                setReportConfig((prev) => ({
                  ...prev,
                  dateRange: { startDate: "", endDate: "" },
                }))
              }
              className={`w-full ${!reportConfig.dateRange.startDate && !reportConfig.dateRange.endDate ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-500" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
            >
              All Time
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Report Sections
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="selectAllSections"
              checked={
                Object.entries(filteredReportSections).length > 0 &&
                Object.entries(filteredReportSections).every(
                  ([_, enabled]) => enabled,
                )
              }
              onCheckedChange={handleSelectAllSections}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label
              htmlFor="selectAllSections"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Select All Sections
            </Label>
          </div>
          {allowedSections.map((section) => {
            const Icon = getSectionIcon(section);
            const colorClass = getSectionColor(section);
            const label = getSectionLabel(section);

            return (
              <div key={section} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={reportConfig.reportSections[section] || false}
                  onChange={(e) =>
                    handleSectionToggle(section, e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Report Actions */}
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Actions
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || !isConfigValid()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isGenerating ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Report
              </>
            )}
          </Button>

          {showScheduling && (
            <Popover
              open={isSchedulePopoverOpen}
              onOpenChange={setIsSchedulePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isGenerating || !isConfigValid()}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {scheduledDate
                    ? format(scheduledDate, "PPP")
                    : "Schedule Report"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => {
                    setScheduledDate(date);
                    setIsSchedulePopoverOpen(false);
                    alert(`Report scheduled for ${format(date, "PPP")}`);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {showPauseScheduled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isGenerating}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Scheduled Reports
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Pause</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to pause all scheduled reports? You
                    can resume them later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      alert("All scheduled reports have been paused.")
                    }
                  >
                    Pause
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportConfigurator;

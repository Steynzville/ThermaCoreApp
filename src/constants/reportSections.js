import {
  FileText,
  AlertTriangle,
  Wrench,
  Activity,
  Shield,
  DollarSign,
} from "lucide-react";

export const reportTypes = [
  {
    id: "all-sections",
    name: "All Sections Report",
    description: "Includes all available report sections",
    icon: FileText,
    sections: [
      "vitalStatistics",
      "alertsAlarms",
      "maintenance",
      "performance",
      "compliance",
      "salesRevenue",
    ],
  },
  {
    id: "vital-statistics",
    name: "Vital Statistics Report",
    description:
      "Comprehensive report on vital statistics such as power gen, water gen, system temps, system pressures, and battery charges",
    icon: FileText,
    sections: ["vitalStatistics"],
  },
  {
    id: "alerts-alarms",
    name: "Alerts & Alarms Report",
    description: "Detailed analysis of all alerts and alarms",
    icon: AlertTriangle,
    sections: ["alertsAlarms"],
  },
  {
    id: "maintenance",
    name: "Maintenance Report",
    description: "Maintenance schedules, completed work, and recommendations",
    icon: Wrench,
    sections: ["maintenance"],
  },
  {
    id: "performance",
    name: "System Performance Report",
    description: "Uptime, downtime, fault analysis, and operational metrics",
    icon: Activity,
    sections: ["performance"],
  },
  {
    id: "compliance",
    name: "Compliance Report",
    description: "Regulatory compliance and certification status",
    icon: Shield,
    sections: ["compliance"],
  },
  {
    id: "sales-revenue",
    name: "Sales and Revenue Report",
    description: "Detailed report on sales and revenue data",
    icon: DollarSign,
    sections: ["salesRevenue"],
  },
];

export const reportSections = [
  {
    id: "vitalStatistics",
    name: "Vital Statistics",
    description:
      "Comprehensive vital statistics data including power generation, water generation, system temperatures, system pressures, and battery charges.",
  },
  {
    id: "alertsAlarms",
    name: "Alerts and Alarms",
    description: "Detailed logs and analysis of system alerts and alarms.",
  },
  {
    id: "maintenance",
    name: "Maintenance",
    description:
      "Records of maintenance schedules, completed tasks, and recommendations.",
  },
  {
    id: "performance",
    name: "Performance",
    description:
      "Metrics on system uptime, downtime, fault analysis, and operational efficiency.",
  },
  {
    id: "compliance",
    name: "Compliance",
    description:
      "Information on regulatory compliance and certification status.",
  },
  {
    id: "salesRevenue",
    name: "Sales and Revenue",
    description:
      "Financial data including sales figures and revenue generation.",
  },
];

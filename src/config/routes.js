import { lazy } from "react";

const Dashboard = lazy(() => import("../components/Dashboard"));
const HistoryView = lazy(() => import("../components/HistoryView"));
const AdminPanel = lazy(() => import("../components/AdminPanel"));
const SettingsView = lazy(() => import("../components/SettingsView"));
const AlertsView = lazy(() => import("../components/AlertsView"));
const AlarmsView = lazy(() => import("../components/AlarmsView"));
const GridView = lazy(() => import("../components/GridView"));
const UnitControl = lazy(() => import("../components/UnitControl"));
const UnitDetails = lazy(() => import("../components/UnitDetails"));
const UserUnitDetails = lazy(() => import("../components/UserUnitDetails"));
const RemoteControl = lazy(() => import("../components/RemoteControl"));
const UnitPerformance = lazy(() => import("../components/UnitPerformance"));
const ViewAnalytics = lazy(() => import("../components/ViewAnalytics"));
const SystemHealth = lazy(() => import("../components/SystemHealth"));
const SynchronizeUnitsOverview = lazy(
  () => import("../components/SynchronizeUnitsOverview"),
);
const ReportsPage = lazy(() => import("../pages/ReportsPage"));
const DocumentsPage = lazy(() => import("../pages/DocumentsPage"));

const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/history",
    component: HistoryView,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/settings",
    component: SettingsView,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/alerts",
    component: AlertsView,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/remote-control",
    component: RemoteControl,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/grid-view",
    component: GridView,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/alarms",
    component: AlarmsView,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/reports",
    component: ReportsPage,
    isProtected: true,
    roles: ["admin", "user"],
  },
  {
    path: "/documents",
    component: DocumentsPage,
    isProtected: true,
    roles: ["admin", "user"],
  },
  // Units route with role-based component selection
  {
    path: "/units",
    component: null, // Will be handled specially in App.jsx
    isProtected: true,
    roles: ["admin", "user"],
    specialHandling: "unit-role-based",
  },
  // Admin-only routes
  {
    path: "/admin",
    component: AdminPanel,
    isProtected: true,
    roles: ["admin"],
  },
  {
    path: "/analytics",
    component: ViewAnalytics,
    isProtected: true,
    roles: ["admin"],
  },
  {
    path: "/system-health",
    component: SystemHealth,
    isProtected: true,
    roles: ["admin"],
  },
  {
    path: "/synchronize-units",
    component: SynchronizeUnitsOverview,
    isProtected: true,
    roles: ["admin", "user"],
  },
  // Dynamic routes that need special handling
  {
    path: "/unit/:id",
    component: null, // Will be handled specially in App.jsx
    isProtected: true,
    roles: ["admin", "user"],
    specialHandling: "unit-role-based",
  },
  {
    path: "/unit-details/:id",
    component: null, // Will be handled specially in App.jsx
    isProtected: true,
    roles: ["admin", "user"],
    specialHandling: "unit-details-role-based",
  },
  {
    path: "/unit-performance/:id",
    component: UnitPerformance,
    isProtected: true,
    roles: ["admin", "user"],
  },
];

export default routes;

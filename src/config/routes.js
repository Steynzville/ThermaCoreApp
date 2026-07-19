import { lazy } from "react";

const Dashboard = lazy(() => import("../components/Dashboard"));
const HistoryView = lazy(() => import("../components/HistoryView"));
const AdminLanding = lazy(() => import("../pages/AdminLanding"));
const AdminPanel = lazy(() => import("../components/AdminPanel"));
const SettingsView = lazy(() => import("../components/SettingsView"));
const AlertsView = lazy(() => import("../components/AlertsView"));
const AlarmsView = lazy(() => import("../components/AlarmsView"));
const GridView = lazy(() => import("../components/GridView"));
const RemoteControl = lazy(() => import("../components/RemoteControl"));
const UnitPerformance = lazy(() => import("../components/UnitPerformance"));
const ViewAnalytics = lazy(() => import("../components/ViewAnalytics"));
const SystemHealth = lazy(() => import("../components/SystemHealth"));
const SynchronizeUnitsOverview = lazy(
  () => import("../components/SynchronizeUnitsOverview"),
);
const UserRegistrationForm = lazy(
  () => import("../components/UserRegistrationForm"),
);
// Phase 3 & 4 Components
const AdvancedAnalyticsDashboard = lazy(
  () => import("../components/AdvancedAnalyticsDashboard"),
);
const MultiProtocolManager = lazy(
  () => import("../components/MultiProtocolManager"),
);
const ReportsPage = lazy(() => import("../pages/ReportsPage"));
const DocumentsPage = lazy(() => import("../pages/DocumentsPage"));
const RealtimeScadaDashboard = lazy(
  () => import("../components/RealtimeScadaDashboard"),
);
const ScadaMainPage = lazy(() => import("../components/ScadaMainPage"));

const routes = [
  // Public registration route - no authentication required
  {
    path: "/register",
    component: UserRegistrationForm,
    isProtected: false,
    roles: [],
  },
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
  // NOTE: isAdminRoute is documentation only - ProtectedRoute handles role checking
  {
    path: "/admin",
    component: AdminLanding,
    isProtected: true,
    roles: ["admin"],
    isAdminRoute: true, // Documentation: admin-only route
  },
  {
    path: "/admin/users",
    component: AdminPanel,
    isProtected: true,
    roles: ["admin"],
    isAdminRoute: true, // Documentation: admin-only route
  },
  {
    path: "/analytics",
    component: ViewAnalytics,
    isProtected: true,
    roles: ["admin"],
    isAdminRoute: true, // Documentation: admin-only route
  },
  // NOTE: routes with roles: [] are intentionally open to ALL authenticated users
  // (operators, viewers, admins). These are read-only/telemetry views that do not
  // expose write/control actions. Any write actions inside these components must
  // be separately gated with role checks.
  {
    path: "/advanced-analytics",
    component: AdvancedAnalyticsDashboard,
    isProtected: true,
    roles: [], // Open to all authenticated users (read-only view)
  },
  {
    path: "/scada-dashboard",
    component: ScadaMainPage,
    isProtected: true,
    roles: [], // Open to all authenticated users (read-only view)
  },
  {
    path: "/realtime-scada",
    component: RealtimeScadaDashboard,
    isProtected: true,
    roles: [], // Open to all authenticated users (read-only view)
  },
  {
    path: "/protocol-manager",
    component: MultiProtocolManager,
    isProtected: true,
    roles: [], // Open to all authenticated users (read-only view)
  },
  {
    path: "/system-health",
    component: SystemHealth,
    isProtected: true,
    roles: ["admin"],
    isAdminRoute: true, // Documentation: admin-only route
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

# ThermaCore Integrated SCADA: Operator Manual
## Operational Guidelines & Dashboard Navigation Manual for Utility Engineers

This user guide provides instructions for navigating and managing ThermaCore modular power and water generation units through the centralized SCADA web interface.

---

## 1. System Navigation Overview

The ThermaCore SCADA interface features a responsive, high-contrast Navy & Gold display. The sidebar contains 6 main navigation areas:

```

┌────────────────────────────────────────────────────────┐
│  ThermaCore Navigation Sidebar                         │
├────────────────────────────────────────────────────────┤
│  [■] Main Dashboard       - Fleet KPIs & active alarms │
│  [▤] Asset Grid          - Unit list & status details │
│  [⚙] Remote Controls     - Critical override commands │
│  [📈] Performance & COP   - Historical trends & ROI    │
│  [🔒] Tenant Switcher     - Select active client scope │
│  [👥] User Management     - Approvals & audit logs     │
└────────────────────────────────────────────────────────┘

```

**Note**: The **Tenant Switcher** and **User Management** links are only visible to users with Administrator privileges. Regular Operators and Viewers do not see these navigation items.

---

## 2. Main Live Dashboard & Fleet KPIs

The main landing page provides an immediate status summary of the generator fleet:
* **Active Units Ratio**: Displays the number of generators actively online and transmitting data.
* **Aggregated Thermal Output (MW)**: Real-time cumulative power output across all operational loops.
* **Clean Water Output (L/hr)**: Cumulative clean water production metrics from integrated physical water filtration loops.
* **Alert Feed**: A real-time, scrolling alert feed displaying warning indicators, sorted by chronological urgency.

---

## 3. Unit Fleet Grid & Asset Management

To view specific modular generator nodes, navigate to the **Asset Grid**:
* **Fuzzy Search & Filters**: Filter units by status (`Online`, `Warning`, `Critical Outage`, `Maintenance`), region, or ID.
* **Real-Time Node Cards**: Display individual thermodynamic metrics:
  * Heat Exchanger Temperatures ($T_{hot}$, $T_{cold}$)
  * Mass flow rates ($\dot{m}$)
  * Hydraulic pump status
* **Adding/Editing Units**: Operators with Administrative clearance can register new units by entering the asset ID, serial number, location coordinates, and local PLC protocol.

---

## 4. Secure Remote Edge Control Operations

ThermaCore SCADA enables secure, bidirectionally authenticated remote control over the physical generator loops.

REMOTE SHUTDOWN EXECUTION FLOW

```

┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ Operator clicks       │ ───► │ Enter 2FA Override   │ ───► │ Cryptographic command │
│ "Emergency Shutdown"  │      │ Authentication Code   │      │ signed & sent to edge │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘

```

### Safety Operational Protocols
1. **Critical Overrides**: Any override of physical safety loops (e.g., triggering emergency shutdown, adjusting coolant flow limits) must be verified through the control confirmation modal.
2. **Four-Eyes Principle**: High-impact remote control operations require secondary administrator authorization codes before executing on physical PLC hardware.
3. **Execution Feedback**: Once dispatched, the platform monitors telemetry for 5 seconds to confirm that the physical actuator has responded (indicated by a state change from `Active` to `Closed`).

---

## 5. Alerts & Alarm Handshake Management

Alarms are classified dynamically according to threat severities:
* **Critical (Red)**: Critical mechanical/electrical failures (e.g., pressure leaks, temperature thermal runaway). Action must be taken immediately.
* **Warning (Yellow)**: Non-lethal thermodynamic deviations (e.g., flow rate dropping slightly).
* **Info (Blue)**: Routine operational changes (e.g., user logged in, maintenance bypass engaged).

### Alarm Acknowledgment Handshake
* Operators are required to click the **Acknowledge** button on active alerts.
* Operators must log a descriptive comment detailing the on-site resolution or cause (e.g., *"Replaced worn hydraulic valve gasket, pressure normalized"*).
* This action is stamped with the operator's ID, timestamp, and logged directly into the immutable compliance ledger.

---

## 6. Enterprise Admin & Permission Panel

Administrators possess master fleet supervisory privileges:
* **Admin Landing Page (Post-Login)**: Upon successful authentication, administrator accounts are redirected to the `/admin` landing page where they must choose an active tenant context before accessing any scoped metrics.
* **New User Approvals**: All self-registered users are assigned read-only "Viewer" status by default. Admins must explicitly authorize and promote new users from the User Management dashboard.
* **Audit Trail Reviews**: Accesses a real-time event list tracking system activities, containing:
  * Tracing IDs and IP Addresses
  * Action names (e.g., `User Elevated`, `Emergency Command Sent`)
  * Target asset IDs

---

## 7. Performance Dashboard & Thermodynamic Analytics

Used by operations managers to evaluate thermodynamic and financial metrics:
* **Thermodynamic Modeling**: Computes thermal heat transfer rates ($Q = \dot{m} \cdot C_p \cdot \Delta T$) and the mechanical **Coefficient of Performance (COP)**.
* **Financial ROI Tracking**: Tracks dynamic calculations that project operational cost savings, payback timelines, and carbon mitigation credits based on current active generation profiles.
* **Assumptions Editor**: Enables managers to fine-tune energy market rates, water values, and carbon offset values to align with localized economic conditions.

---

## 8. Engineering SCADA PFD View

For on-site engineers, the **Engineering View** displays a live Process Flow Diagram (PFD) of the thermal loop:
* **Dynamic Pipe Overlays**: Overlays animate color and speed representing liquid fluid flow velocities.
* **Interactive Sensor Hubs**: Hovering over pipe junctions opens high-resolution tooltips detailing real-time fluid properties and sensor health diagnostics.
* **Protocol Indicators**: Live protocol lights confirm the health of the physical ingest path (`MQTT`, `OPC-UA`, `Modbus-TCP`, `DNP3`).

---

## 9. Multi-Tenant Administration & Context Selection

ThermaCore SCADA supports fully isolated multi-tenant operations to enable service providers to manage multiple customer fleets from a single system.

### 9.1 Admin Landing Page (`/admin`)

Administrative accounts land on the dedicated **Admin Landing** page at `/admin` immediately after login. This page:
* Displays a welcome message and the ThermaCore logo
* Lists all available tenants in a dropdown selector
* Includes a "Go to Dashboard" button that activates once a tenant is selected
* Provides an **"All Tenants"** option to view aggregated data across all fleets

This is a deliberate security barrier to ensure all subsequent actions are safely isolated to the correct customer account. The selected tenant context is stored in `sessionStorage` and persists throughout the active session.

### 9.2 Real-Time Tenant Switching

While viewing the main dashboard, administrators can switch their focused tenant at any time using the **Tenant Switcher** dropdown located in the dashboard header:
* The dropdown displays all available tenants plus the **"All Tenants"** option
* Selecting a new tenant updates the dashboard view instantly
* Unit lists, telemetry data, and metrics automatically refresh to reflect the selected tenant's scope
* No full system logout or login is required — switching happens seamlessly

**Tenant View Behavior:**
| Selection | Behavior |
| :--- | :--- |
| **Specific Tenant** | Shows only units belonging to that tenant (typically 6 units per tenant) |
| **"All Tenants"** | Shows all units across every tenant (all 20 units in the fleet) |

### 9.3 Returning to Admin Landing

Administrators can return to the tenant selection page at any time by:
* Clicking the **Tenant Switcher** menu item (Shield icon) in the left sidebar
* The navigation redirects to `/admin` where a new tenant can be selected

### 9.4 Tenant Context Persistence

The active tenant selection is preserved using `sessionStorage`:
* The `tenant_selected` flag persists throughout the active browser session
* Refreshing the page maintains the current tenant context
* **Cleared automatically**:
  - When the user logs out
  - When a new login occurs (ensures admins always see the landing page on fresh login)
  - When the browser tab is closed

### 9.5 Non-Admin User Experience

Regular Operators and Viewers (non-admin users):
* Do not see the Tenant Switcher in the dashboard header
* Do not have access to the `/admin` landing page
* Are always scoped to their assigned single tenant
* Cannot switch tenants or view "All Tenants" data

---

*End of Operator Manual*

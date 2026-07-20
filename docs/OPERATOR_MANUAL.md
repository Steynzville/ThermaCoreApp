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

```
                  REMOTE SHUTDOWN EXECUTION FLOW
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
* **Admin Panel Landing Page (Post-Login)**: Upon successful authentication, administrator accounts are redirected to the `/admin` landing page where they must choose an active tenant context before accessing any scoped metrics.
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

ThermaCore SCADA supports fully isolated multi-tenant operations to enable service providers to manage multiple customer fleets from a single system:

### 9.1 Post-Login Tenant Landing
* Administrative accounts land on the central **Tenant Landing** page immediately after login.
* The landing page provides a greeting and requires selecting an active tenant before navigating to the live dashboard.
* This is a deliberate barrier to ensure all subsequent actions are safely isolated to the correct customer account.

### 9.2 Real-Time Tenant Switching
* While viewing the main dashboard, administrators can switch their focused tenant at any time using the **Tenant Switcher** dropdown in the dashboard header.
* Selecting a new tenant automatically updates the header title, loaded telemetry, unit list, and associated metrics instantly without needing a full system logout/login.

### 9.3 Navigating to Tenant Switcher Page
* Click the **Tenant Switcher** menu item in the left sidebar to return to the selection landing page at any time.

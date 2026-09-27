# ThermaCore Integrated SCADA: FAQ Document
## Frequently Asked Questions for Operators, Managers, and System Administrators

This FAQ provides quick answers to common questions about navigating and managing the ThermaCore SCADA Platform.

---

## 1. User & Account Management

### Q1: How do I reset my password?
1. Navigate to the login screen and click **Forgot Password**.
2. Enter your registered email address and click **Send Link**.
3. Check your inbox for the password reset email, click the link, and enter a new, secure password.
4. *Admin note*: If automated email delivery is down, a system administrator can manually reset your credentials through the **System Admin Panel**.

### Q2: Why does my newly registered account say "Pending Approval"?
To safeguard critical energy infrastructure, all self-registered user accounts are assigned read-only "Viewer" status and marked as **Pending** by default. You cannot view detailed metrics or trigger control actions until an administrator manually verifies and elevates your account permissions.

---

## 2. Platform Navigation & Metrics

### Q3: How do I view historical thermodynamic metrics?
1. Open the sidebar navigation and select **Performance & COP** (`📈`).
2. Select your target asset node from the top-left dropdown menu.
3. Choose your desired timeframe (`24h`, `7d`, `30d`, `1y`) and select the metric you wish to plot (e.g., *Temp Out - Chill*, *Temp Out - Hot*, *Differential Pressure*, *Flow Rate Out - Chill*, *Flow Rate Out - Hot*, *AWG Water Level*, *Battery Voltage*).
4. You can export historical data tables directly to CSV for external analysis.

### Q4: What are the primary system safety thresholds and alarm rules?
* **NH3 Leak Alarm (< 4 bar Differential Pressure)**: Triggers a critical red alarm warning of toxic ammonia refrigerant leakage.
* **High Differential Pressure Auto-Shutdown (> 6 bar Differential Pressure)**: Automatically shuts down unit operations to protect compressors and piping.
* **Low Battery Voltage (< 23V)**: Triggers a warning alert to preserve remote telemetry communication backup.
* **High Battery Voltage (> 27V)**: Triggers a warning alert for battery overcharge protection.

### Q5: What is Coefficient of Performance (COP) and why is it important?
Coefficient of Performance (COP) measures the thermodynamic efficiency of our generator thermal loops. It calculates the ratio of useful heat transfer to the mechanical energy input. A higher COP indicates a highly optimized, low-cost operation.

---

## 3. Alerts & Control Security

### Q5: How do I acknowledge an active system alarm?
1. Locate the alarm in the **Active Alarms Feed** on the main dashboard.
2. Click the yellow or red alarm card to open the **Alarm Details** dialog box.
3. Review the on-site resolution guidelines.
4. Input your resolution notes in the text box (e.g., *"Pressure leak resolved, replaced copper fitting"*).
5. Click **Acknowledge Alarm** to clear the visual indicator and log the resolution history.

### Q6: What happens if our physical internet connection goes down?
* **Edge Gateway Resilience**: Our physical modular generators continue to log timeseries telemetry locally on integrated SD card caches.
* **Automated Sync**: The moment network connectivity is re-established, the gateway automatically uploads the stored log files, populating the historical timeline without telemetry gaps.
* **Manual Override Safe**: If internet connectivity is interrupted during a critical event, on-site engineers can override the web SCADA system by flipping the generator's physical panel toggle to **Manual Mode** to execute safety controls locally.

### Q7: Why can't I see the Multi-Protocol Manager as an Operator or Viewer?
The Multi-Protocol Manager provides direct access to manage low-level industrial protocols (MQTT, OPC UA, Modbus TCP, DNP3) and edge gateway configurations. To maintain system security and prevent unauthorized fieldbus configuration changes, this module is strictly reserved for System Administrators. Operators and Viewers are restricted from viewing the sidebar link and will be automatically redirected to `/dashboard` if attempting direct route access.

---

## 4. Subscriptions & Billing

### Q8: What are the software subscription tiers?
We offer three software licensing packages tailored to different operation sizes:
* **Standard Tier**: Includes real-time read-only dashboards, threshold alarms, and basic email support.
* **Premium Tier**: Adds bidirectional remote overrides, cryptographically signed commands, custom historical reports, and 24/7 priority support.
* **Enterprise Optimization Tier**: Unlocks advanced thermodynamic predictive maintenance diagnostics, automated loop tuning recommendations, and multi-tenant management for fleet operators.

### Q9: What is the Client Admin role and how does multi-tenant scoping work?
The Client Admin (`client_admin`) role allows enterprise client managers to administer all facilities and units belonging to their organization (`client_id`). Client Admins can switch between all facilities under their client scope, manage user roles (Operators and Viewers) within their organization, and configure local facility settings without seeing or affecting other client organizations on the ThermaCore platform.

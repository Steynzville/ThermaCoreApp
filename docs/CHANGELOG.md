# ThermaCore Integrated SCADA: Change Log
## Software Releases, Security Patches, and Operational Updates

This document tracks all changes, security updates, and performance optimizations made to the ThermaCore SCADA Platform.

---

## [v2.8.1] - July 2026

### 🐛 Bug Fixes
* **Client Admin Tenant Filtering**: Fixed critical issue where Client Admin users saw all tenants instead of only those belonging to their client organization.
  * Enhanced `TenantContext` filtering logic to properly filter by `client_id` in both the `try` and `catch` blocks.
  * Added fallback filtering for mock tenants when API is unavailable, ensuring Client Admin sees only ACME tenants even during network issues.
  * Updated `TenantSwitcher` to use `canSwitchTenants` instead of `isAdmin` for role checking, allowing both `admin` and `client_admin` to access the switcher.
  * Fixed `Dashboard` component to use `canSwitchTenants` for redirect logic and tenant switcher rendering.

### 📝 Documentation
* Updated API Reference (`API_REFERENCE.md`) with tenant filtering behavior documentation.
* Added Client Admin tenant filtering troubleshooting section to `DEPLOYMENT_GUIDE.md`.
* Added comprehensive troubleshooting section for Client Admin filtering issues in `TROUBLESHOOTING.md`.
* Clarified Client Admin tenant filtering behavior in `OPERATOR_MANUAL.md`.
* Documented filtering implementation in `DEVELOPER_ONBOARDING.md`.

### 🔧 Backend Fixes
* Added `fix_client_admin_migration.py` script to repair Client Admin user records.
* Enhanced `seed_client_admin_data()` function to update existing Client Admin users with correct `client_id`.
* Added validation queries for Client Admin tenant filtering diagnostics.

### 🧪 Testing
* Updated `TenantContext.test.jsx` to cover Client Admin filtering scenarios.
* Added tests for Client Admin tenant filtering on API success and failure paths.
* Added tests for Client Admin with no `client_id` and with non-existent `client_id`.

---

## [v2.8.0] - July 2026

### 🚀 Client Admin Role & Multi-Tenant Scoping (Backend & Database)
* **Client Admin Role (`CLIENT_ADMIN`)**: Added `CLIENT_ADMIN = "client_admin"` to `RoleEnum` with administrative scope across all tenants under a specific client organization.
* **Client Model & Multi-Tenant Schema Expansion**:
  * Created `Client` model (`backend/app/models/client.py`) with `clients` table (`id`, `name`, `created_at`, `updated_at`).
  * Updated `Tenant` and `User` models in `backend/app/models/__init__.py` with foreign key `client_id` pointing to `clients.id`.
* **Database Migration & Seeding (`auto_migration.py`)**:
  * Added auto-migration functions (`create_clients_table`, `add_client_id_to_tenants`, `add_client_id_to_users`).
  * Seeded initial client "ACME Energy", three facilities ("ACME Sydney", "ACME Melbourne", "ACME Brisbane"), and default Client Admin user (`clientadmin@thermacore.com` / `clientadmin123`).
* **Middleware & API Scoping**:
  * Updated `tenant.py` middleware to scope queries by `client_id` for Client Admin users while allowing System Admins full cross-tenant visibility.
  * Updated `/auth/login` response payload and `build_login_response` to include `client_id` and `is_approved`.
  * Updated `/tenants` routes to enforce client-based tenant filtering and validation.

---

## [v2.7.0] - July 2026

### 🚀 New Features & Enhancements
* **Admin Tenant Switcher Integration**: Implemented a comprehensive multi-tenant management interface for administrative users.
  * **Admin Landing Page**: Added a dedicated tenant selection portal for administrator accounts, facilitating immediate redirection upon authentication. Administrators now land on `/admin` where they must select a tenant before accessing any tenant-specific data.
  * **Global Tenant Switcher Header**: Integrated a live dropdown tenant selector directly inside the main Dashboard header, allowing seamless context-switching for administrator roles without requiring a full logout/login cycle.
  * **Enhanced Sidebar Navigation**: Upgraded navigation rails with a Return-to-Tenant-Switcher link (labeled "Tenant Switcher" with Shield icon) and a separate User Management view for administrator accounts.
  * **Role-Based Access Control**: Admin-only routes are now protected via `ProtectedRoute` with `roles: ["admin"]` configured in `routes.js`, ensuring consistent role normalization across the application.

### 🛡️ Security & Hardening Updates
* **Restricted Multi-Protocol Manager to System Admin Only**: Closed a security vulnerability where Viewers and Operators could view and modify the Multi-Protocol Manager.
  * Added component route guard in `MultiProtocolManager.jsx` automatically redirecting non-admin users to `/dashboard`.
  * Updated `canViewProtocols` permission in `permissions.js` to strictly return `true` only for `admin` backendRole.
  * Updated `SideNavigation.jsx` to hide the Protocol Manager link from non-admin users.
  * Updated permission and protocol manager test suites (`permissions.test.js` and `MultiProtocolManager.test.jsx`).

### 📊 Testing & Quality Assurance
* **Test Coverage Maintenance**: Updated test suites for `App`, `Dashboard`, `SideNavigation`, `AdminLanding`, and `routes` to cover the new tenant switching functionality.
* **Route Configuration Validation**: Added structural tests ensuring `isAdminRoute` documentation matches actual `roles` configuration for all admin-only routes.

---

## [v2.6.0] - June 2026

### 📊 Testing & Quality Assurance Milestones
* **Enterprise Test Coverage Milestone**: Achieved elite status verification levels across both frontend and backend codebases.
  * **Frontend (Vitest)**: Achieved **97.34% statement coverage**, **89.57% branch coverage**, and **98.21% function coverage**.
  * **Backend (Pytest)**: Reached **~90% overall statement coverage**.
  * **Automated Suite Expansion**: Expanded total test coverage to **3,700+ passing assertions** (comprising 377 frontend unit/integration tests and 3,323+ backend tests).

---

## [v2.5.0] - June 2026

### 🚀 New Features & Enhancements
* **Modular Generator Product Alignment**: Completely aligned the SCADA metrics system to map onto physical modular power and water generator properties (including filtration flow rates and dual thermal loops).
* **Process Flow Diagrams**: Added dynamic, SVG-animated Process Flow Diagrams to the detailed unit page, showing fluid flow and loop operational status.
* **Audit Trail Exporter**: Implemented CSV/JSON exporters on the Enterprise Admin audit ledger to simplify regulatory compliance reports.

### 🛡️ Security & Hardening Updates
* **Dual-Token Handshake**: Upgraded session mechanics to employ short-lived JWT access tokens paired with secure, HttpOnly, SameSite=Strict cookies to eliminate cross-site scripting (XSS) vectors.
* **Command Overrides Signing**: Enforced strict cryptographic signing on remote physical commands. Remote overrides now require multi-operator validations prior to execution.
* **Least Privilege Container**: Upgraded the Docker runtime execution profile to run under a dedicated unprivileged user (`thermacore`) instead of root.

### 🐛 Bug Fixes
* **WebSocket Heartbeat Drift**: Fixed an issue where persistent Socket.io handshakes timed out prematurely during low telemetry cycles.
* **D3 Render Flicker**: Resolved an SVG rendering conflict in the Performance chart dashboard when transitioning between large timeframes.

---

## [v2.0.0] - April 2026

### 🚀 New Features & Enhancements
* **TimescaleDB Partitioning**: Integrated TimescaleDB database hyper-tables, partitioning incoming timeseries records by 7-day intervals to maintain fast query speeds across billions of rows.
* **Multitenancy Architecture**: Added logical separation of assets and user lists based on operator tenant registrations.

### 🛡️ Security Updates
* **Content Security Policy (CSP)**: Implemented a rigid Content Security Policy to eliminate clickjacking and inline script injections.
* **Database Parameterization**: Migrated all raw database queries to SQLAlchemy's parameterized structures to prevent SQL Injection attempts.

---

## [v1.0.0] - January 2026

### 🚀 Initial Product Release
* **Platform Bootstrapping**: Launched the initial React + Flask blueprint layout.
* **Industrial Protocol Handlers**: Added ingestion adapters for OPC-UA, MQTT, and Modbus-TCP.
* **Live Alarm Systems**: Implemented live alerts and the basic operator acknowledgment handshake.

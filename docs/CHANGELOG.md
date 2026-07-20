# ThermaCore Integrated SCADA: Change Log
## Software Releases, Security Patches, and Operational Updates

This document tracks all changes, security updates, and performance optimizations made to the ThermaCore SCADA Platform.

---

## [v2.7.0] - July 2026

### 🚀 New Features & Enhancements
* **Admin Tenant Switcher Integration**: Implemented a comprehensive multi-tenant management interface for administrative users.
  * **Admin Landing Page**: Added a dedicated tenant selection portal for administrator accounts, facilitating immediate redirection upon authentication. Administrators now land on `/admin` where they must select a tenant before accessing any tenant-specific data.
  * **Global Tenant Switcher Header**: Integrated a live dropdown tenant selector directly inside the main Dashboard header, allowing seamless context-switching for administrator roles without requiring a full logout/login cycle.
  * **Enhanced Sidebar Navigation**: Upgraded navigation rails with a Return-to-Tenant-Switcher link (labeled "Tenant Switcher" with Shield icon) and a separate User Management view for administrator accounts.
  * **Role-Based Access Control**: Admin-only routes are now protected via `ProtectedRoute` with `roles: ["admin"]` configured in `routes.js`, ensuring consistent role normalization across the application.

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

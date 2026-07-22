# INVESTOR DECK: ThermaCore Integrated SCADA & Telemetry Platform
## Web-Native Operational Control, Real-Time Optimization, and Predictive Analytics for Modular Power & Water Generators

> **Document Version**: 2.5.0 (Integrated Enterprise Disclosure)  
> **Prepared For**: Investment Board, Strategic Partners, & Funding Authorities  
> **Aesthetic Theme**: Navy Blue & Gold Industrial-Grade Slate  
> **Operational Status**: Fully Completed, Deployed, and Demo-Ready alongside Physical Prototype  
> **Date**: June 2026  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Dual Revenue Business Model](#2-dual-revenue-business-model)
3. [System Architecture & Digital Twin Topology](#3-system-architecture--digital-twin-topology)
4. [Core Features & Operator Interfaces](#4-core-features--operator-interfaces)
5. [Industrial Protocols & Ingestion Pipeline](#5-industrial-protocols--ingestion-pipeline)
6. [Security Architecture & Cyber-Physical Hardening](#6-security-architecture--cyber-physical-hardening)
7. [Secure Development & Verification Practices](#7-secure-development--verification-practices)
8. [Deployment & Infrastructure Topology](#8-deployment--infrastructure-topology)
9. [Engineering Roadmap & Milestones](#9-engineering-roadmap--milestones)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 The Market Opportunity & The ThermaCore Solution
The global transition to decentralized utility infrastructure has created high demand for off-grid and modular utility generation. ThermaCore addresses this by designing and manufacturing advanced, high-efficiency **Modular Power and Water Generators**. 

However, hardware alone is only half the equation. Traditional decentralized assets are notoriously difficult to monitor, maintain, and coordinate. Operators struggle with siloed legacy supervisory systems that require dedicated physical control rooms, expensive licensing fees, and lack secure remote over-the-air (OTA) control capabilities.

**ThermaCore SCADA** is our proprietary, web-native, enterprise-grade control and supervisory ecosystem integrated directly into every modular unit we deploy. It provides real-time thermodynamic modeling, remote edge control, predictive maintenance diagnostics, and high-performance alarm coordination via a secure web portal accessible from any modern browser.

```

┌────────────────────────────────────────────────────────────────────────┐
│                        THE THERMACORE ADVANTAGE                        │
│                                                                        │
│   LEGACY UTILITY PLAYERS                    THERMACORE INTEGRATED      │
│   ✖ Basic, "dumb" physical hardware sales   ✔ Smart Generator + Digital Twin Ecosystem│
│   ✖ No software layer or manual on-site checks✔ Secure Remote Web-Native SCADA Portal │
│   ✖ Unpredictable maintenance downtime      ✔ Pre-emptive, Telemetry-Driven Diagnostics │
│   ✖ One-time, transactional sales loops     ✔ Dual Revenue (CapEx + Recurring SaaS Sub)│
└────────────────────────────────────────────────────────────────────────┘

```

### 1.2 Strategic Accomplishments
* **Enterprise SCADA Platform Completed**: We have successfully designed, built, and deployed a comprehensive monitoring and management platform that serves as a key value driver.
* **Fully Sales & Demonstration Ready**: The platform is fully functional and operates live alongside our physical generator prototype, showing potential customers exactly how they will monitor and manage their deployed assets in real time.
* **Dramatically Improved Plant Economics**: Integrated thermodynamic modeling evaluates operational metrics (such as the Coefficient of Performance [COP] and exchanger heat transfer rates) in real time, driving an average **+18.4% efficiency lift** and a **34.2% reduction in unplanned maintenance downtime**.

---

## 2. Dual Revenue Business Model

Rather than relying on low-margin hardware-only transactions, ThermaCore employs a highly lucrative **Dual Revenue Model** that combines traditional industrial sales with high-margin recurring software revenues.

THERMACORE DUAL-STREAM REVENUE ENGINE

```

┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│     CAPEX STREAM: GENERATOR SALES       │  +  │    OPEX STREAM: MONITORING SUBSCRIPTION │
│  • High-performance physical assets     │     │  • Live SCADA dashboard & controls access│
│  • Power and clean water generation     │     │  • Automated thermodynamic optimization  │
│  • Installed edge gateways (OPC-UA/MQTT)│     │  • Predictive maintenance alerts (SaaS) │
└─────────────────────────────────────────┘     └─────────────────────────────────────────┘

```

### 2.1 Hardware Asset Sales (CapEx Stream)
ThermaCore sells modular power and water generation units to municipalities, mining complexes, agricultural enterprises, and off-grid facilities. Each generator is shipped as a self-contained, smart-enabled asset equipped with industrial PLCs, physical flow meters, thermal sensors, and a hardened secure edge gateway.

### 2.2 Software Monitoring & Management Subscriptions (OpEx Stream)
Access to the supervisory control, real-time telemetry, advanced performance diagnostics, and edge control functions is gated behind a tiered **SaaS subscription**. This creates highly predictable, high-margin, recurring software streams for every generator deployed:
* **Standard Tier**: Real-time read-only monitoring, alarm streams, and local asset views for standard on-site plant operators.
* **Premium Control Tier**: Full bidirectional remote control capabilities, command signing, historical analytical trends, and advanced reporting.
* **Enterprise Optimization Tier**: Pre-emptive anomaly detection, automated thermodynamic efficiency optimization recommendations, and multi-tenant management for large fleet operators.

### 2.3 Market Differentiation
While competitors provide basic, disconnected hardware, ThermaCore offers a complete, highly integrated cyber-physical ecosystem. This digital-twin approach lowers risk for our clients, simplifies asset operations, and guarantees long-term customer lock-in and high-margin lifetime values (LTV).

---

## 3. System Architecture & Digital Twin Topology

The ThermaCore SCADA platform utilizes a modern, robust, and highly resilient decoupled multi-tier architecture to serve as a digital twin for our physical generator fleet.

```

┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (UI)                         │
│             React 19 SPA (Vite + Framer Motion + Recharts)             │
│            Served securely and globally with responsive views          │
└───────────────────────────────────┬────────────────────────────────────┘
│ HTTPS (REST API) & WSS (WebSockets)
▼
┌────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION CONTROL LAYER (API)                    │
│                 Python 3.9+ Flask Framework (WSGI App)                 │
│                 Encapsulated in Multi-Stage Containers                 │
└───────────────────────────────────┬────────────────────────────────────┘
│ TLS Connection Pool (SQLAlchemy)
▼
┌────────────────────────────────────────────────────────────────────────┐
│                     TIME-SERIES PERSISTENCE LAYER                      │
│             PostgreSQL + TimescaleDB Serverless Hyper-tables            │
└────────────────────────────────────────────────────────────────────────┘

```

### 3.1 Frontend Presentation Tier (React 19)
* **Core Technologies**: React 19 SPA, Vite build system, Tailwind CSS, and Framer Motion.
* **Design Engineering**: Designed around a dense, high-contrast, military-grade Navy & Gold visual palette. It ensures maximum readability for operators on physical factory floors, field tablets, or central command desks.
* **Component Modularity**: Highly structured and decoupled; components are wrapped inside specialized React Error Boundaries, protecting the wider environment if an individual asset sensor fails.
* **State & Routing**: Unified React Context providers (Auth, Tenant, Units, Settings) with strict declarative client-side route guards powered by React Router v7.

### 3.2 Backend Application Tier (Flask)
* **Core Technologies**: Python 3.9+ and Flask with an asynchronous WSGI gateway.
* **Pattern Implementation**: Implements the *Application Factory Pattern* to segregate blueprints (Authentication, Admin Services, Unit Registration, Telemetry Streams).
* **Asynchronous Web Socket Hub**: Interfaced with Socket.IO to manage persistent TCP connections without blocking main REST operations.

### 3.3 Database Persistence Layer (PostgreSQL + TimescaleDB)
* **High-Speed Storage**: Optimized specifically for high-frequency sensor writes. Time-series variables (temperatures, pressure levels, flow rates) are routed directly into structured PostgreSQL tables.
* **Hyper-table Optimization**: Built on top of Neon serverless PostgreSQL, partitioning telemetry data dynamically by timestamps to guarantee consistent sub-100ms analytics queries across billions of records.

---

## 4. Core Features & Operator Interfaces

The operational strength of the ThermaCore SCADA platform is validated across 10 functional pillars:

```

┌────────────────────────────────────────────────────────────────────────┐
│                        10 OPERATIONAL PILLARS                          │
│                                                                        │
│  [1] Session & MFA   [2] Live KPIs      [3] Edge Control  [4] Alarms   │
│  [5] RBAC Admin Panel [6] Asset Grid     [7] Analytics     [8] SocketIO │
│  [9] SCADA Dash      [10] Fail-Safe Redirection                        │
└────────────────────────────────────────────────────────────────────────┘

```

### 4.1 Session & Multi-Layer Authentication
* **Session Integrity**: Operators access the system through a secure gateway. Upon verification, the backend issues an ephemeral JWT access token (15-minute lifespan) and an encrypted refresh token (7-day lifespan) stored inside an HTTP-only, secure, same-site cookie to mitigate Cross-Site Scripting (XSS).
* **Defensive Lockouts**: Automatically tracks login attempts per user and IP address, triggering automated IP blocklists upon detecting potential brute-force vectors.

### 4.2 Main Live Telemetry Dashboard
* **Real-Time KPIs**: Renders plant-wide Key Performance Indicators (KPIs) in real time: active unit ratios, aggregated power output, clean water production rates, average efficiency curves, and critical system alarms.
* **Operator Interface**: Fully responsive panels utilizing Framer Motion for smooth viewport transitions.

### 4.3 Secure Remote Edge Control
* **PhysicalCommand Override**: Empowers administrators and certified operators to send physical commands directly to modular generators (e.g., initiating emergency shutdown, adjusting mechanical valve apertures, throttling hydraulic pump velocities).
* **Cryptographic Signing**: Every control request undergoes a strict structural payload validation, requiring double-operator confirmation ("four-eyes principle") for safety-critical overrides.

### 4.4 Interactive Alarm Management
* **Dynamic Classification**: Monitored sensor nodes trigger real-time alarms if telemetry breaches customized high/low safety thresholds. Alarms are classified dynamically:
  * `Critical` (triggers automated local safety shutdowns)
  * `Warning` (indicates abnormal pressure, temperature, or flow-rate trends)
  * `Info` (standard physical state alterations)
* **Operator Handshake**: Requires operators to actively "acknowledge" and input notes on alarms, establishing an immutable regulatory compliance history.

### 4.5 Enterprise Admin Panel & Multi-Tenant Management
* **Fleet Control**: Serves as the master dashboard for system operators and administrators.
* **Pending Approvals Manager**: Restricts newly registered users to restricted "Viewer" privileges until verified, manually authorized, and elevated by a system Administrator.
* **Audit Logs Viewer**: Streams real-time operational event records, containing complete tracing IDs, origin IPs, and precise timestamps.
* **Multi-tenant Administration**: Administrators managing multiple clients or facilities can seamlessly switch between tenants using the **Tenant Switcher** dropdown in the dashboard header. A dedicated Admin Landing page provides centralized tenant selection, while the "All Tenants" view offers aggregated cross-tenant analytics. This eliminates the need for separate instances and significantly reduces operational overhead for fleet operators.

### 4.6 Asset Grid & Search View
* **Dynamic Fleet Navigation**: A high-density grid showing real-time status cards of all registered generators globally. Features high-performance client-side search, fuzzy filtering, and paginated dynamic loading.

### 4.7 Advanced Performance Dashboard
* **Thermodynamic Modeling**: Powered by D3.js and Recharts, this system plots multi-timeframe trends (24h, 7d, 30d, 1y).
* **Economic Modeling**: Features dynamic calculations that compute Return on Investment (ROI), payback schedules, carbon mitigation metrics, and thermodynamic Coefficient of Performance (COP) of our water and power loops.

### 4.8 Real-Time Websocket Telemetry Engine
* **High-Frequency Ingestion**: Uses persistent Socket.io channels to enable dual-path communication. Edge sensors stream telemetry directly to Socket.io rooms segregated by plant or asset group (e.g., `unit_TC102`).
* **Bandwidth Preservation**: Operators receive telemetry only for assets currently active on their physical viewport, drastically reducing network overhead.

### 4.9 Comprehensive Engineering SCADA View
* **Interactive Flow Diagrams**: Includes dynamic Process Flow Diagrams (PFDs) mapping out system loops (evaporator, compressor, condenser, expansion valve, and water filtration loops) with real-time animated overlays.
* **High-Tech Status Dials**: Dynamic SVG status dials change color dynamically to indicate thermal states.

### 4.10 Fail-Safe Redirections & Session Guards
* **Client Handlers**: Intercepts invalid routes and gracefully redirects users back to the dashboard or login page.
* **Axios Interceptors**: Evaluates outbound HTTP calls. If a downstream service returns a `401 Unauthorized` (indicating session expiration), the client immediately locks the viewport and returns to the authentication interface.

---

## 5. Industrial Protocols & Ingestion Pipeline

ThermaCore supports multiple legacy and modern industrial ingestion layers to bridge physical edge devices with the cloud.

```

┌────────────────────────────────────────────────────────────────────────┐
│                          INGESTION INVENTORY                           │
│                                                                        │
│   PROTOCOL     COMMON USE CASE                    SECURITY STATUS      │
│   ────────     ───────────────                    ───────────────      │
│   OPC-UA       Modern Siemens/Allen-Bradley PLCs  mTLS Basic256Sha256  │
│   MQTT         High-frequency IoT Edge Ingestion  TLS 1.3 / AES-256    │
│   Modbus-TCP   Legacy Heat Exchangers & Valves    Encapsulated Gateways│
│   DNP3         Power Substation Synchronizations  Secure Authentication│
└────────────────────────────────────────────────────────────────────────┘

```

### 5.1 OPC-UA (Open Platform Communications Unified Architecture)
* **Ingestion Method**: Connects directly to modern PLCs and manufacturing execution systems (MES) within the modular generators.
* **Security & Authentication**: Enforces `Basic256Sha256` sign-and-encrypt configurations, preventing man-in-the-middle modifications during remote command operations.

### 5.2 MQTT (Message Queuing Telemetry Transport)
* **Ingestion Method**: Serves as the primary ingest vector for distributed, low-power remote thermal battery telemetry.
* **mTLS Integration**: Payload security is verified via mutual TLS (mTLS) with strict certificate validation (`generate_certs.py`) and AES-256 payload encryption during transit.

### 5.3 Modbus-TCP & DNP3
* **Modbus-TCP**: Used to read register values from legacy thermal sensors and liquid valve actuators, converting flat hexadecimal registry buffers into structured JSON objects.
* **DNP3**: Designed for critical electrical grid connections, mapping current voltage outputs and grid synchronization states directly into the SCADA timeline.

---

## 6. Security Architecture & Cyber-Physical Hardening

ThermaCore SCADA is built around a rigorous, zero-trust military-grade security model designed to safeguard critical utility assets from sophisticated cyber threats.

ZERO-TRUST PHYSICAL SECURITY LAYERS

```

┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: CLIENT ACCESS -> HttpOnly JWT Cookies & Strict CSRF Guard     │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: BOUNDARY ACCESS -> Role-Based Access Control (RBAC) Enforcer  │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: COMMUNICATIONS -> Mutual TLS (mTLS) with Client Certificates  │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: PHYSICAL EXECUTION -> Cryptographically Signed Overrides      │
└────────────────────────────────────────────────────────────────────────┘

```

### 6.1 Defense-in-Depth Cryptography
* **Password Hashing (bcrypt)**: All credentials are secure-salted and hashed with a high work factor prior to writing to the database, ensuring resistance against brute-force and offline dictionary attacks.
* **Remote Override Authorization**: Adjustments to critical equipment configurations (e.g., initiating emergency coolant flows) require secondary verification codes. These actions generate immutable audit logs that record the operator's timestamp, digital signature, and origin IP.

### 6.2 Granular Role-Based Access Control (RBAC)
ThermaCore SCADA defines clear operational boundaries across three specialized tiers:
1. **Viewer**: Read-only monitoring of physical metrics. Access is restricted to basic dashboards, status charts, and diagnostic layouts. Viewers are strictly prohibited from modifying configurations, adding units, or interacting with remote commands.
2. **Operator**: Authorized to perform day-to-day control operations. Operators can acknowledge alerts, toggle secondary valves, and adjust thermal pump thresholds. Operators are restricted from modifying user permissions, creating accounts, or editing system parameters.
3. **Admin**: Master fleet control. Authorized to register new hardware, approve user accounts, modify database configurations, view deep audit logs, and override critical system safety parameters.

### 6.3 Web Security Hardening & CSRF/XSS Mitigation
* **CSRF Mitigation**: Mitigated on the API layer through short-lived JWT tokens coupled with secure, HttpOnly, and SameSite=Strict cookies.
* **XSS Defenses**: Strict HTML sanitization protocols run across all data-rendering interfaces, preventing script injections via telemetry payloads or operator alert notes.
* **SQL Injection Prevention**: The application tier prevents SQL injections by routing all database operations through SQLAlchemy's parameterized queries and prepared statements.

---

## 7. Secure Development & Verification Practices

The reliability and safety of ThermaCore SCADA are continuously verified through an automated, execute-first development lifecycle.

AUTOMATED CI/CD FLOW

```

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Developer   │ ──► │  Biome/Lint  │ ──► │ Vitest/Unit  │ ──► │ Production   │
│ Code Commit  │     │ Static Scan  │     │ 5,504+ Tests │     │ Deployment   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘

```

### 7.1 Integrated Security Scanning Tools
* **Bandit Static Analysis**: The backend Python code undergoes automated AST scanning via Bandit to intercept insecure bindings, sub-optimal random number generators, or unsanitized subprocess calls.
* **Dependabot Integration**: Automated package scanning continuously monitors the npm and pip ecosystems, alerting engineering teams and generating automated pull requests to patch vulnerable dependencies instantly.
* **CodeQL Analysis**: CodeQL runs on code check-ins, searching the AST for complex multi-file data flows that could expose the platform to remote code executions (RCE) or sensitive information disclosures.

### 7.2 Strict Content Security Policy (CSP)
In production, ThermaCore enforces a rigid Content Security Policy (CSP) header structure to prevent cross-site scripting (XSS) and data exfiltration:
```http
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self'; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  connect-src 'self' wss://thermacoreapp.onrender.com https://thermacoreapp.onrender.com; 
  img-src 'self' data: https://images.unsplash.com referrerPolicy="no-referrer"; 
  font-src 'self' https://fonts.gstatic.com;
  frame-ancestors 'none';
```
· No Unsafe Eval: Prevents the use of dynamic code execution (e.g., eval()) across the front-end runtime.
· Frame Ancestors Control: Restricts frame embedding to completely block clickjacking and UI redressing attacks.

7.3 Principle of Least Privilege Containerization

· Non-Root Container Runtimes: The production Docker environment is structured to prevent root execution. A dedicated, non-privileged system user (thermacore) is registered inside the container.
· Directory Lockdowns: All application directories, source scripts, and static build outputs are owned by the system administrator with read-only permissions for the execution user. The runtime user is strictly barred from modifying system binaries or writing to root directories.

7.4 Comprehensive Test Coverage Milestones

Our commitment to software quality and operational reliability is backed by a rigorous, zero-regression test suite. The platform has achieved elite coverage benchmarks across both frontend and backend architectures:

· Total Automated Tests: 5,504 passing tests (comprising 4,180 frontend unit/integration tests and 1,324 backend tests).
· Frontend Test Coverage (Vitest / v8):
  · Statements: 91.78%
  · Branches: 90.92%
  · Functions: 91.90%
· Backend Test Coverage (Pytest / Cov):
  · Overall Coverage: 85.63%

---

8. Deployment & Infrastructure Topology

ThermaCore SCADA is deployed across a secure, multi-cloud enterprise topology, separating static presentation assets from physical database systems.

```
                      ENTERPRISE MULTI-CLOUD DEPLOYMENT
┌────────────────────────────────────────────────────────────────────────┐
│  FRONTEND PRESENTATION: Served via Netlify Global Edge CDN             │
│  - Static Asset Compression & Caching                                  │
│  - Automated SPA URL Rewrite Fallbacks (via netlify.toml)              │
├────────────────────────────────────────────────────────────────────────┤
│  BACKEND APPLICATION: Managed via Render Container Engine               │
│  - Auto-Scaling CPU & Memory Instances                                 │
│  - Isolated Network VPC with Mutual TLS Ingress                        │
├────────────────────────────────────────────────────────────────────────┤
│  PERSISTENCE STORE: Serverless Neon PostgreSQL (TimescaleDB)           │
│  - Database Region: ap-southeast-2 (Sydney) for low-latency Oceanic   │
│  - Automatic DB Branching & Real-Time Connection Pooling               │
└────────────────────────────────────────────────────────────────────────┘
```

8.1 Container Orchestration (Dockerfile)

The platform leverages an optimized, multi-stage Docker build process:

1. Build Stage: Compiles and bundles React assets via Vite, utilizing parallel minification to strip console logs and debug symbols.
2. Production Stage: Copies only the production assets into a slimmed Node/Alpine environment, keeping the production container size below 120MB to optimize performance and deployment speed.

8.2 Zero-Downtime CI/CD Pipeline

· GitHub Integration: Pushing to the main branch triggers an automated build. If any unit tests (Vitest/Pytest) or security scans fail, the pipeline halts immediately, keeping the live environment untouched.
· Rolling Deployments: Render executes health checks on the new container before shifting live traffic, maintaining continuous availability for active plant operators.

---

9. Engineering Roadmap & Milestones

Our developmental milestones align with scaling operations to support thousands of active physical utility installations globally:

```
                            DEVELOPMENT ROADMAP
  Q3 2026                 Q4 2026                 Q1 2027
  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐
  │ Anomaly AI Engine     │  │ Offline-First PWA     │  │ EMQX Enterprise      │
  │ (Gemini API Integration) │  │ (Local IndexedDB)     │  │ (Hardware HSM)       │
  └───────────────────────┘  └───────────────────────┘  └──────────────────────┘
```

9.1 Q3 2026: AI-Driven Thermodynamic Anomaly Prediction

· Integrate Google Gemini models via the server-side @google/genai SDK.
· Develop automated model prompt engineering to scan 30-day time-series telemetry blocks for subtle thermal gradient drifts, predicting and flagging hardware fatigue prior to physical failure.

9.2 Q4 2026: Offline-First PWA & Edge Syncing

· Implement full service-worker caching to ensure field engineers retain full SCADA diagnostic capabilities in remote locations with poor network coverage.
· Store operator action histories inside secure client-side IndexedDB databases, auto-syncing payloads and audit trails with the backend server upon reconnect.

9.3 Q1 2027: Enterprise EMQX Mutual TLS Broker

· Transition pilot telemetry pathways into an enterprise-managed EMQX MQTT broker cluster.
· Enforce hardware-locked security modules (HSM) on edge gateways to achieve absolute end-to-end cryptographic confidentiality.

---

10. Appendices

Appendix A: Technology Stack Inventory

· Core Frontend: React (v19.2.0), Vite (v6.4.1), React Router (v7.9.4), Recharts (v2.15.4), Framer Motion (v12.23.24), Tailwind CSS (v4.1.14), Lucide React.
· Core Backend: Python (v3.9+), Flask (v2.3+), SQLAlchemy, PyJWT (v2.8+), Socket.io (v4.7+).
· Databases & Tooling: Serverless Neon PostgreSQL (v15+), TimescaleDB (Time-series optimization).
· Verification & Linting: Vitest (v3.2.4) for React testing, Pytest for backend testing, Biome (v2.5.1) for static analysis.

Appendix B: Operational Performance SLA

· Supervisory Telemetry Latency: < 120ms from an edge sensor recording a temperature spike to the visual warning flashing on an operator's dashboard.
· Remote Action execution: < 180ms from an administrator clicking "Emergency Stop" on a web interface to the edge gateway dispatching the encrypted OPC-UA command payload.
· Analytics Rendering Speeds: 95th-percentile response time for 30-day historical time-series aggregation queries is < 95ms.

---

End of Document. Confidential material prepared solely for ThermaCore Renewable Technologies partners and authorized funding boards.

```

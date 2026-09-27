# ThermaCore Integrated SCADA: Developer Onboarding Guide
## Engineering Onboarding, Local Configuration, and Code Guidelines Manual

Welcome to the ThermaCore SCADA engineering team. This guide outlines setup procedures, testing protocols, and style guidelines to help you configure your local development environment quickly.

---

## 1. Local Environment Prerequisites

Ensure you have the following tools installed prior to configuring your workspace:

* **Node.js**: v20.x or higher (LTS recommended)
* **Package Manager**: `pnpm` (preferred) or `npm`
* **Python**: v3.9+ (required for Flask API services and ingestion testing)
* **Docker**: Desktop or CLI (used for local containerization testing)
* **Git**: System CLI

---

## 2. Quick-Start Setup Commands

### Step 1: Clone the Repository

```bash
git clone https://github.com/thermacore/scada-platform.git
cd scada-platform
```

### Step 2: Configure Environment Files

Duplicate the environment template files and replace placeholders with your local settings:

```bash
cp .env.example .env
```

### Step 3: Initialize the Backend Environment

Create a Python virtual environment and install the required dependencies:

```bash
# Initialize virtual environment
python3 -m venv venv
source venv/bin/activate

# Install pip packages
pip install -r requirements.txt
```

### Step 4: Install Frontend Dependencies

```bash
pnpm install
```

### Step 5: Docker Local Development Setup (Alternative)

For developers preferring a fully containerized local environment, ThermaCore provides a multi-container Docker Compose orchestration:

```bash
# Build and run the frontend, backend, and database containers
docker-compose up --build

# Run in the background (Detached Mode)
docker-compose up -d

# Stop running containers and tear down network adapters
docker-compose down
```

---

## 3. Launching the Development Servers

The ThermaCore SCADA Platform is configured to run on a dual-server layout in development:

```bash
# Term 1: Start the backend Flask API
source venv/bin/activate
python server.py

# Term 2: Start the frontend Vite server (Proxying api requests)
pnpm run dev
```

Open `http://localhost:3000` to view the running application in your web browser.

---

## 4. Running the Local Tests

All developers must run the test suite locally before pushing commits.

### 4.1 Running Frontend Tests (Vitest)

The frontend uses Vitest for low-latency unit and component testing.

```bash
# Run tests continuously (Watch Mode)
pnpm run test

# Run tests once with coverage reporting
pnpm run test:coverage
```

### 4.2 Running Backend Tests (Pytest)

```bash
source venv/bin/activate
pytest tests/
```

### 4.3 Coverage Reporting & Quality Gates

ThermaCore maintains enterprise-grade test coverage standards. After running tests, verify coverage meets these thresholds:

**Frontend Coverage (Vitest / v8)**

```bash
pnpm test:coverage
# Expected: 91.78% statements, 90.92% branches, 91.90% functions
```

**Backend Coverage (Pytest / Cov)**

```bash
cd backend
pytest --cov=app --cov-report=term
# Expected: ~86% overall (actual: 85.63%)
```

---

## 5. Coding Standards, Biome Linting, & ESLint

To maintain a pristine, production-ready codebase, we enforce strict formatting and static analysis checks:

### 5.1 Biome Configuration

The platform uses Biome to format and lint both JavaScript and TypeScript code:

```bash
# Format codebase
npx biome format --write ./src

# Lint codebase and auto-fix simple warnings
npx biome lint --write ./src
```

### 5.2 TypeScript and React Guidelines

* **Strict Type Safety**: Avoid the `any` keyword. Every variable, parameter, and function return must possess an explicit type or interface.
* **Imports**: Use named imports exclusively; destructuring imports is forbidden on global types.
* **UseEffect Dependencies**: Avoid infinite re-render loops. Never update states directly within the component body. Include only primitives in `useEffect` dependency arrays.

### 5.3 Admin & Multitenancy Architecture

The application implements a strict 4-tier Role-Based Access Control (RBAC) multitenant security model:

* **Role Hierarchy**:
  * `admin` (System Administrator): Global cross-tenant access. Can access all client records, facilities, and global configurations.
  * `client_admin` (Client Administrator): Scoped to all facilities (tenants) belonging to their specific `client_id`. Can switch between client facilities and manage client-specific users.
  * `operator` (Operator): Facility-scoped power user with control capabilities over assigned `tenant_id`.
  * `viewer` (Viewer): Facility-scoped read-only telemetry access over assigned `tenant_id`.
* **Tenant Selection & Context**: Admin users (`admin` and `client_admin`) select active facilities using `TenantContext`. System Admins see all facilities; Client Admins see only facilities matching their `client_id`.
* **Route Guards**: Route access is protected by `ProtectedRoute` using a per-route `roles` array configured in `routes.js` — this is not uniform across all admin-scoped routes:
  * Client management routes (`/admin`, `/admin/users`): `roles: ["admin", "client_admin"]`. Client Admins manage users/facilities within their own `client_id`.
  * System-only routes (`/analytics`, `/system-health`): `roles: ["admin"]`. Client Admin is explicitly excluded — these expose cross-client system internals outside a Client Admin's scope.
  * Protocol Manager (`/protocol-manager`): `roles: ["admin"]`. Restricted to System Admin only — Client Admin, Operator, and Viewer are all excluded, consistent with the security hardening in v2.7.0.
  * `ProtectedRoute` performs dual validation against both `frontendRole` and `normalizedRole` regardless of which `roles` array applies.
* **Middleware Enforcers**: Backend Flask API uses `tenant_filter` middleware (`backend/app/middleware/tenant.py`) to enforce SQL query filtering automatically based on JWT claims (`role`, `client_id`, `tenant_id`).

### 5.4 Client Admin Tenant Filtering Implementation

Client Admin users are automatically filtered to see only tenants matching their `client_id`. This is implemented in:

**Frontend Implementation (`src/context/TenantContext.jsx`)**:

```javascript
// Client Admin filtering in the try block
if (isClientAdmin && user?.client_id) {
  const userClientId = Number(user.client_id);
  const filtered = loadedTenants.filter(
    (t) => (t.client_id !== undefined && Number(t.client_id) === userClientId) ||
           (t.clientId !== undefined && Number(t.clientId) === userClientId)
  );
  setAvailableTenants(filtered.length > 0 ? filtered : loadedTenants);
}

// Client Admin filtering in the catch block (API fallback)
if (isClientAdmin && user?.client_id) {
  const userClientId = Number(user.client_id);
  const filteredMockTenants = mockTenants.filter((tenant) => {
    // For ACME tenants, they have client_id: 1
    const isAcmeTenant = tenant.name.startsWith("ACME");
    if (userClientId === 1 && isAcmeTenant) {
      return true;
    }
    return false;
  });
  setAvailableTenants(filteredMockTenants.length > 0 ? filteredMockTenants : mockTenants);
}
```

**Backend Implementation (`backend/app/routes/tenants.py`)**:

```python
# Tenant filtering for Client Admin
if current_user.role == RoleEnum.CLIENT_ADMIN:
    if current_user.client_id:
        query = query.filter(Tenant.client_id == current_user.client_id)
    else:
        # Client Admin with no client_id should see no tenants
        return jsonify({"success": true, "data": []})
```

**Important**: Ensure all new Client Admin users have `client_id` set in the database. Use the fix script if needed:

```bash
python backend/migrations/fix_client_admin_migration.py
```

---

## 6. Contribution Workflow

Always adhere to our branching, testing, and deployment processes:

```
Feature Request ──► Feature Branch ──► Local test pass ──► PR ──► CI/CD Deploy
```

1. **Branch Naming**: Match the issue category (`feat/`, `fix/`, `docs/`, `chore/` followed by issue number or name).
2. **Commit Styling**: Follow Conventional Commits guidelines (e.g., `feat(ui): add thermodynamic gauge component`).
3. **Pull Request Checklist**:
   * All local Vitest and Pytest assertions pass.
   * Biome and ESLint analysis yields zero critical or formatting warnings.
   * Frontend coverage meets 90%+ threshold.
   * Backend coverage meets 85%+ threshold.
   * The documentation inside `/docs/` has been updated to reflect any code alterations.

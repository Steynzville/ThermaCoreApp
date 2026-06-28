ThermaCore Integrated SCADA: Developer Onboarding Guide

Engineering Onboarding, Local Configuration, and Code Guidelines Manual

Welcome to the ThermaCore SCADA engineering team. This guide outlines setup procedures, testing protocols, and style guidelines to help you configure your local development environment quickly.

---

1. Local Environment Prerequisites

Ensure you have the following tools installed prior to configuring your workspace:

· Node.js: v20.x or higher (LTS recommended)
· Package Manager: pnpm (preferred) or npm
· Python: v3.9+ (required for Flask API services and ingestion testing)
· Docker: Desktop or CLI (used for local containerization testing)
· Git: System CLI

---

2. Quick-Start Setup Commands

Step 1: Clone the Repository

```bash
git clone https://github.com/thermacore/scada-platform.git
cd scada-platform
```

Step 2: Configure Environment Files

Duplicate the environment template files and replace placeholders with your local settings:

```bash
cp .env.example .env
```

Step 3: Initialize the Backend Environment

Create a Python virtual environment and install the required dependencies:

```bash
# Initialize virtual environment
python3 -m venv venv
source venv/bin/activate

# Install pip packages
pip install -r requirements.txt
```

Step 4: Install Frontend Dependencies

```bash
pnpm install
```

Step 5: Docker Local Development Setup (Alternative)

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

3. Launching the Development Servers

The ThermaCore SCADA Platform is configured to run on a dual-server layout in development:

```bash
# Term 1: Start the backend Flask API
source venv/bin/activate
python server.py

# Term 2: Start the frontend Vite server (Proxying api requests)
pnpm run dev
```

Open http://localhost:3000 to view the running application in your web browser.

---

4. Running the Local Tests

All developers must run the test suite locally before pushing commits.

4.1 Running Frontend Tests (Vitest)

The frontend uses Vitest for low-latency unit and component testing.

```bash
# Run tests continuously (Watch Mode)
pnpm run test

# Run tests once with coverage reporting
pnpm run test:coverage
```

4.2 Running Backend Tests (Pytest)

```bash
source venv/bin/activate
pytest tests/
```

4.3 Coverage Reporting & Quality Gates

ThermaCore maintains enterprise-grade test coverage standards. After running tests, verify coverage meets these thresholds:

Frontend Coverage (Vitest / v8)

```bash
pnpm test:coverage
# Expected: 97.34% statements, 89.57% branches, 98.21% functions
```

Backend Coverage (Pytest / Cov)

```bash
cd backend
pytest --cov=app --cov-report=term
# Expected: ~90% overall
```

---

5. Coding Standards, Biome Linting, & ESLint

To maintain a pristine, production-ready codebase, we enforce strict formatting and static analysis checks:

5.1 Biome Configuration

The platform uses Biome to format and lint both JavaScript and TypeScript code:

```bash
# Format codebase
npx biome format --write ./src

# Lint codebase and auto-fix simple warnings
npx biome lint --write ./src
```

5.2 TypeScript and React Guidelines

· Strict Type Safety: Avoid the any keyword. Every variable, parameter, and function return must possess an explicit type or interface.
· Imports: Use named imports exclusively; destructuring imports is forbidden on global types.
· UseEffect Dependencies: Avoid infinite re-render loops. Never update states directly within the component body. Include only primitives in useEffect dependency arrays.

---

6. Contribution Workflow

Always adhere to our branching, testing, and deployment processes:

```
    Feature Request ──► Feature Branch ──► Local test pass ──► PR ──► CI/CD Deploy
```

1. Branch Naming: Match the issue category (feat/, fix/, docs/, chore/ followed by issue number or name).
2. Commit Styling: Follow Conventional Commits guidelines (e.g., feat(ui): add thermodynamic gauge component).
3. Pull Request Checklist:
   · All local Vitest and Pytest assertions pass.
   · Biome and ESLint analysis yields zero critical or formatting warnings.
   · Frontend coverage meets 97%+ threshold.
   · Backend coverage meets 85%+ threshold.
   · The documentation inside /docs/ has been updated to reflect any code alterations.
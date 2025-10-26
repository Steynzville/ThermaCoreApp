# Testing Guide

This document describes the testing infrastructure and practices for the ThermaCore frontend application.

## Overview

The ThermaCore application uses a comprehensive testing suite focused on SCADA critical components with emphasis on real-time data handling, protocol communications, and industrial monitoring features.

### Test Coverage Goals

- **Overall Coverage**: 60%+ (currently ~24%)
- **Critical SCADA Components**: 80%+ each
- **Protocol Components**: 80%+
- **General Components**: 50%+

## Test Infrastructure

### Framework & Tools

- **Test Runner**: Vitest (v3.2.4)
- **Testing Library**: @testing-library/react (v16.3.0)
- **Coverage**: @vitest/coverage-v8 (v3.2.4)
- **Environment**: jsdom

### Test Utilities

Located in `src/tests/`:

#### Mocks (`src/tests/mocks/`)

1. **mockWebSocket.js** - WebSocket simulation
   - 60fps streaming simulator
   - Connection lifecycle management
   - Multi-source data aggregation
   - Buffer overflow scenarios
   - Network latency simulation

2. **mockProtocols.js** - Protocol service mocks
   - MockModbusService (registers, coils)
   - MockOPCUAService (nodes, subscriptions)
   - MockDNP3Service (binary/analog points)

#### Fixtures (`src/tests/fixtures/`)

1. **scadaFixtures.js** - Test data generators
   - SCADA metrics generation
   - Time-series data with trends
   - Alarm and alert data
   - System health data
   - Performance metrics
   - 60fps streaming data

2. **authFixtures.js** - Authentication test data
   - Mock user objects with different roles
   - Authentication context configurations
   - Token and session data
   - Login/logout response mocks
   - Pre-configured context fixtures (admin, user, unauthenticated)

3. **apiFixtures.js** - API response mocks
   - Success and error responses
   - Paginated response builders
   - CRUD operation responses
   - Network error scenarios
   - Common error fixtures (401, 403, 404, 500)

4. **websocketFixtures.js** - WebSocket test utilities
   - Mock WebSocket instances
   - WebSocket server simulator
   - Streaming data generators
   - Real-time SCADA data mocks
   - Protocol data message builders

5. **protocolDataFactories.js** - Protocol data generators
   - DNP3 data factory (outstations, binary/analog I/O, events)
   - MQTT data factory (brokers, subscriptions, messages, statistics)
   - Modbus data factory (devices, registers, coils, transactions)
   - OPC UA data factory (servers, nodes, subscriptions, diagnostics)
   - Protocol event and error generators
   - Time-series data generation for protocol metrics
   - Mixed protocol data for multi-protocol scenarios

6. **dashboardFixtureUtils.js** - Protocol dashboard test utilities
   - Dashboard rendering helpers with providers
   - Protocol connection testing utilities
   - Protocol data loading assertions
   - Mock WebSocket factory for protocol testing
   - Protocol statistics and metrics assertions
   - Error and loading state helpers
   - Mock configuration generators

#### Utilities (`src/tests/utils/`)

1. **testHelpers.js** - Helper functions
   - Component rendering with providers
   - Performance testing harness
   - 60fps streaming validator
   - Async operation helpers
   - Canvas context mocking
   - Console error tracking

## Refactoring for Testability

The codebase has been systematically refactored to improve testability by extracting business logic from components into reusable hooks and utilities.

### Custom Hooks (`src/hooks/`)

#### Admin Panel Hooks

1. **useUserManagement.js** - User CRUD operations
   - User list fetching and state management
   - User creation with role selection
   - User editing and deletion
   - Role fetching and validation
   - Form state management

2. **usePasswordManagement.js** - Password reset functionality
   - Password reset modal state
   - Real-time password validation
   - Admin password reset operations
   - Self-password reset capability
   - Error handling and user feedback

3. **useSystemSettings.js** - System configuration
   - Email notifications toggle
   - Auto backup settings
   - Maintenance mode control

#### Remote Control Hooks

1. **useCameraControls.js** - Camera and video management
   - Camera selection and switching
   - Video feed activation/deactivation
   - Fullscreen mode handling
   - Cross-browser fullscreen support
   - Audio feedback integration

2. **useDeviceConnection.js** - Device remote control
   - Machine power control
   - Water production control
   - Auto-switch functionality
   - Connection state management
   - Loading states for async operations

### Visualization Utilities (`src/utils/`)

1. **chartDataTransforms.js** - Data transformation
   - Time-series data generation
   - Timeframe configurations (day, month, year, etc.)
   - SCADA data transformation
   - Data aggregation (average, max, min, sum)
   - Data normalization
   - Moving average calculation
   - Gap filling in time-series data

2. **chartConfigurations.js** - Chart configuration
   - Line chart configurations
   - Bar chart configurations
   - Area chart configurations
   - Axis configurations
   - Legend configurations
   - Metric-specific configurations (temperature, pressure, power, etc.)
   - Tick formatters (number, percentage, currency, time, etc.)
   - Timeframe selector options
   - Color palettes (light and dark mode)

### Testing Patterns

#### Testing Custom Hooks

```javascript
import { renderHook, act } from "@testing-library/react";
import { useUserManagement } from "../hooks/useUserManagement";

it("should fetch users on mount", async () => {
  const { result } = renderHook(() => useUserManagement());
  
  await waitFor(() => {
    expect(result.current.isLoadingUsers).toBe(false);
    expect(result.current.users.length).toBeGreaterThan(0);
  });
});
```

#### Testing Data Transformations

```javascript
import { generateTimeSeriesData } from "../utils/chartDataTransforms";

it("should generate correct number of data points", () => {
  const data = generateTimeSeriesData("day");
  expect(data).toHaveLength(24); // 24 hours
});
```

#### Testing Chart Configurations

```javascript
import { createChartConfig } from "../utils/chartConfigurations";

it("should create line chart config with metrics", () => {
  const config = createChartConfig("line", ["temperature", "pressure"]);
  expect(config.metrics).toHaveLength(2);
  expect(config.smooth).toBe(true);
});
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test -- src/tests/ComponentName.test.jsx
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in CI

```bash
npm run test:ci
```

## Test Organization

### Test File Structure

Tests are organized by component type:

```
src/tests/
├── mocks/                      # Mock implementations
│   ├── mockWebSocket.js
│   └── mockProtocols.js
├── fixtures/                   # Test data
│   └── scadaFixtures.js
├── utils/                      # Test utilities
│   └── testHelpers.js
├── ComponentName.test.jsx      # Component tests
└── serviceName.test.js         # Service tests
```

### Test Suite Organization

Each test file should follow this structure:

```javascript
describe("ComponentName", () => {
  beforeEach(() => {
    // Setup
  });

  describe("Feature Category", () => {
    it("should test specific behavior", () => {
      // Test implementation
    });
  });
});
```

## Writing Tests for SCADA Components

### Real-Time Components

For components with WebSocket/real-time updates:

```javascript
import { MockWebSocket, create60fpsStreamSimulator } from "./mocks/mockWebSocket";
import { create60fpsDataGenerator } from "./fixtures/scadaFixtures";

// Setup WebSocket mock
beforeEach(() => {
  global.WebSocket = MockWebSocket;
});

// Test streaming updates
it("should handle 60fps updates", async () => {
  const generator = create60fpsDataGenerator();
  // ... test implementation
});
```

### Protocol Components

For protocol configuration and communication:

```javascript
import { createMockProtocolService } from "./mocks/mockProtocols";

// Create mock service
const modbusService = createMockProtocolService("modbus", {
  host: "192.168.1.100",
  port: 502
});

// Test protocol operations
await modbusService.connect();
const result = await modbusService.readHoldingRegisters(0, 10);
```

### Canvas-Based Components

For components using canvas (gauges, charts):

```javascript
import { setupMockCanvas } from "./utils/testHelpers";

beforeEach(() => {
  mockContext = setupMockCanvas();
});

it("should draw on canvas", () => {
  render(<IndustrialGauge value={50} />);
  
  expect(mockContext.arc).toHaveBeenCalled();
  expect(mockContext.stroke).toHaveBeenCalled();
});
```

### Performance Testing

For components requiring performance validation:

```javascript
import { PerformanceTestHarness, StreamingPerformanceValidator } from "./utils/testHelpers";

it("should maintain 60fps", async () => {
  const validator = new StreamingPerformanceValidator({ targetFPS: 60 });
  
  validator.start();
  // ... render updates
  const results = validator.stop();
  
  expect(results.meetsTarget).toBe(true);
});
```

## Test Categories

### Unit Tests

Test individual components and functions in isolation:

```javascript
it("should calculate correct value", () => {
  const result = calculateMetric(input);
  expect(result).toBe(expected);
});
```

### Integration Tests

Test component interactions:

```javascript
it("should update chart when data changes", async () => {
  const { rerender } = render(<Dashboard />);
  
  rerender(<Dashboard data={newData} />);
  
  await waitFor(() => {
    expect(screen.getByText(newValue)).toBeInTheDocument();
  });
});
```

### Performance Tests

Test rendering and update performance:

```javascript
it("should handle rapid updates efficiently", async () => {
  const harness = new PerformanceTestHarness();
  
  const duration = await harness.measure(() => {
    // Perform rapid updates
  });
  
  expect(duration).toBeLessThan(100); // ms
});
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad:
```javascript
expect(component.state.count).toBe(5);
```

✅ Good:
```javascript
expect(screen.getByText("Count: 5")).toBeInTheDocument();
```

### 2. Use Meaningful Test Descriptions

❌ Bad:
```javascript
it("works", () => { ... });
```

✅ Good:
```javascript
it("should display error message when connection fails", () => { ... });
```

### 3. Clean Up After Tests

```javascript
afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
```

### 4. Avoid Testing Library Implementation Details

- Test what users see and interact with
- Avoid testing internal state
- Focus on component behavior

### 5. Use Test Data Generators

```javascript
import { generateAlarmData } from "./fixtures/scadaFixtures";

const alarms = generateAlarmData(10, { maxPriority: 5 });
```

## Testing Dashboard Components

### Overview

Dashboard components require special attention as they often integrate multiple child components, handle navigation, and adapt to user roles and screen sizes.

### Dashboard Component Testing

For the main Dashboard component:

```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../context/ThemeProvider";
import { AuthProvider } from "../context/AuthContext";

// Wrap with necessary providers
const TestWrapper = ({ children, userRole = "admin" }) => (
  <ThemeProvider>
    <AuthProvider value={{ userRole, isAuthenticated: true }}>
      {children}
    </AuthProvider>
  </ThemeProvider>
);

// Test rendering
it("should render dashboard header", () => {
  render(
    <TestWrapper>
      <Dashboard />
    </TestWrapper>
  );
  
  expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
});

// Test role-based rendering
it("should show quick actions for admin users", () => {
  render(
    <TestWrapper userRole="admin">
      <Dashboard />
    </TestWrapper>
  );
  
  expect(screen.getByText("Quick Actions")).toBeInTheDocument();
});

// Test view switching
it("should switch between operator and performance views", async () => {
  render(
    <TestWrapper>
      <Dashboard />
    </TestWrapper>
  );
  
  const toggleButton = screen.getByTestId("view-toggle");
  fireEvent.click(toggleButton);
  
  await waitFor(() => {
    expect(screen.getByTestId("performance-dashboard")).toBeInTheDocument();
  });
});
```

### Status Dial Components

For interactive status dials:

```javascript
// Test rendering with different colors
it("should apply color variant classes", () => {
  const { container } = render(
    <EnhancedStatusDial
      icon={Icon}
      title="Online"
      count={10}
      percentage={80}
      color="green"
      onClick={mockFn}
    />
  );
  
  expect(container.firstChild.className).toContain("text-green-600");
});

// Test click behavior
it("should call onClick when clicked", () => {
  const onClick = vi.fn();
  render(<EnhancedStatusDial {...props} onClick={onClick} clickable={true} />);
  
  const dial = screen.getByRole("button");
  fireEvent.click(dial);
  
  expect(onClick).toHaveBeenCalledTimes(1);
});

// Test keyboard navigation
it("should handle Enter key press", () => {
  const onClick = vi.fn();
  render(<EnhancedStatusDial {...props} onClick={onClick} clickable={true} />);
  
  const dial = screen.getByRole("button");
  fireEvent.keyDown(dial, { key: "Enter" });
  
  expect(onClick).toHaveBeenCalled();
});

// Test accessibility
it("should have proper aria-label", () => {
  render(<EnhancedStatusDial {...props} clickable={true} />);
  
  const dial = screen.getByRole("button");
  expect(dial).toHaveAttribute("aria-label");
});
```

### Navigation Testing

For components that trigger navigation:

```javascript
// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

it("should navigate to correct route", () => {
  render(<QuickActionCard title="Analytics" onClick={mockFn} />);
  
  const button = screen.getByRole("button");
  fireEvent.click(button);
  
  expect(mockNavigate).toHaveBeenCalledWith("/analytics");
});
```

### Responsive Component Testing

For components with mobile-specific behavior:

```javascript
it("should render mobile summary on small screens", () => {
  // The component uses CSS classes like md:hidden for responsiveness
  render(<UnitSummary {...props} />);
  
  const summary = screen.getByTestId("unit-summary");
  expect(summary).toBeInTheDocument();
  // CSS classes handle the actual responsive behavior
});
```

### Animation Mocking

For components using framer-motion:

```javascript
// Mock framer-motion to avoid animation issues
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Test animated components
it("should update percentage value", async () => {
  const { rerender } = render(<StatusDial percentage={50} />);
  
  rerender(<StatusDial percentage={80} />);
  
  await waitFor(() => {
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
});
```

### Testing Patterns Summary

**Dashboard Components Best Practices:**
1. Always wrap with required providers (Theme, Auth)
2. Mock navigation functions from react-router-dom
3. Mock framer-motion for animated components
4. Test role-based rendering (admin vs user)
5. Test responsive behavior with appropriate queries
6. Test keyboard accessibility (Tab, Enter, Space)
7. Use testId for complex components with duplicated text
8. Test color variants and styling classes
9. Test edge cases (zero counts, large numbers, empty states)

## Common Testing Patterns

### Rendering with Providers

```javascript
import { renderWithProviders } from "./utils/testHelpers";

renderWithProviders(<Component />, {
  authValue: { user: mockUser },
  tenantValue: { currentTenant: mockTenant }
});
```

### Async Operations

```javascript
import { waitFor } from "@testing-library/react";

await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});
```

### User Interactions

```javascript
import { fireEvent } from "@testing-library/react";

const button = screen.getByRole("button", { name: /submit/i });
fireEvent.click(button);
```

### Mocking API Calls

```javascript
import { apiPostJson } from "@/utils/apiFetch";

vi.mock("@/utils/apiFetch");

apiPostJson.mockResolvedValue({ success: true, data: mockData });
```

## Coverage Reports

### Viewing Coverage

After running `npm run test:coverage`, view the coverage report:

```bash
# Text summary in terminal output
# JSON summary at: coverage/coverage-summary.json
```

### Coverage Thresholds

The project enforces these coverage thresholds:

- **Overall**: 60% minimum
- **Critical SCADA Components**: 80% minimum
- **Protocol Components**: 80% minimum

### Checking Coverage for Specific Files

```bash
npm run test:coverage -- src/components/ComponentName.jsx
```

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "test description"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

### Console Logging

```javascript
import { screen, debug } from "@testing-library/react";

// Print current DOM
debug();

// Print specific element
debug(screen.getByRole("button"));
```

## Continuous Integration

Tests run automatically on:

- Pull request creation
- Pull request updates
- Push to main branch

CI configuration enforces:

- All tests must pass
- Coverage thresholds must be met
- No console errors or warnings

## Troubleshooting

### Common Issues

#### Tests timeout

Increase timeout in test:
```javascript
it("slow test", async () => { ... }, 10000); // 10 second timeout
```

#### WebSocket not mocking

Ensure mock is set before component renders:
```javascript
beforeEach(() => {
  global.WebSocket = MockWebSocket;
});
```

#### Canvas context errors

Use setupMockCanvas:
```javascript
beforeEach(() => {
  setupMockCanvas();
});
```

#### Act warnings

Wrap state updates in act():
```javascript
import { act } from "@testing-library/react";

await act(async () => {
  // state updates
});
```

## Contributing

When adding new tests:

1. Follow existing test patterns
2. Use appropriate test utilities and mocks
3. Ensure tests are isolated and deterministic
4. Add descriptive test names
5. Update this documentation if adding new patterns

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For questions or issues:

1. Check this documentation
2. Review existing tests for patterns
3. Consult the team
4. Create an issue in the repository

## Coverage Roadmap to 60%+

### Phase 1.5 Results (as of 2025-10-25)

- **Baseline Coverage**: 53.88% (Phase 1 end)
- **Final Coverage**: 54.65% (+0.77% improvement)
- **Target**: 60%+ (Phase 1.5 Goal - NOT FULLY ACHIEVED)
- **Remaining Gap**: 5.35%
- **Status**: SUBSTANTIAL PROGRESS - High-impact service layer coverage achieved

### Coverage Breakdown
- **Lines**: 54.65% (target: 60%, gap: 5.35%)
- **Functions**: 61.80% (✅ TARGET ACHIEVED)
- **Branches**: 78.57% (✅ EXCEEDS TARGET)
- **Statements**: 54.65% (target: 60%, gap: 5.35%)

### Test Results
- **Tests Passing**: 1,493 (was 1,370, +123 new tests)
- **Tests Skipped**: 10 (unchanged)
- **Test Files**: 78 passing (100% pass rate)
- **New Tests Added This Phase**: 130 tests across 4 files

### Phase 1.5 Improvements (Targeted Testing)

**New Test Files Created:**
1. **protocolWebSocketService.test.js** (~450 lines, 37 tests)
   - Connection lifecycle tests
   - Reconnection with exponential backoff
   - Data subscription and event handling
   - Heartbeat mechanism
   - Comprehensive error handling
   - **Impact**: 0% → 94.53% coverage (+274 lines covered)

**Enhanced Test Files:**
2. **ReportConfigurator.test.jsx** (+19 tests, total 31)
   - User interaction flows
   - Form validation scenarios
   - Submission handling
   - Error state handling
   - Scheduling controls

3. **PerformanceDashboard.test.jsx** (+20 tests, total 30)
   - Dialog interactions
   - Data calculation tests
   - User role filtering
   - Performance card display
   - Financial/ROI/Environmental assumptions

4. **useProtocolWebSocket.test.js** (+22 tests, total 32)
   - Error handling scenarios
   - Auto-connect behavior
   - Data subscription cleanup
   - Status change tracking
   - Send method edge cases
   - Offline/online recovery

5. **useRealtimeData.test.js** (+23 tests, total 39)
   - Error state handling
   - Offline/online recovery patterns
   - Data refresh mechanisms
   - Mock data mode switching
   - Connection management

### High-Impact Achievements

**Service Layer Coverage:**
- `protocolWebSocketService.js`: **0% → 94.53%** (274 lines, ~$200 value)
  - Full WebSocket lifecycle management
  - Reconnection with exponential backoff
  - Real-time data subscription
  - Heartbeat keep-alive mechanism
  
**Hook Coverage Improvements:**
- `useProtocolWebSocket.js`: 44.35% → 49.37%
- `useRealtimeData.js`: 53.41% → 54.03%

### Phase 1.5 Summary
✅ **Service Layer Integration**: Achieved 94.53% coverage on critical WebSocket service
✅ **Dashboard Interactions**: Added comprehensive interaction tests
✅ **Hook Error States**: Covered edge cases and recovery patterns
✅ **Zero Production Code Changes**: Maintained constraint
✅ **All Tests Passing**: 1,493 tests (100% pass rate)

### Remaining to 60% (+5.35%)

**Priority Targets for Next Phase:**
1. **Additional Dashboard Tests** (~2-3% impact)
   - AdvancedAnalyticsDashboard interaction tests
   - DeviceStatusDashboard filter/interaction tests

2. **Service Layer Completion** (~1-2% impact)
   - Complete authService edge cases
   - alertService error scenarios
   - analyticsService integration tests

3. **Component Interaction Tests** (~1-2% impact)
   - AdminPanel validation flows
   - RemoteControl interaction scenarios
   - Protocol wizard step flows

### Test Fixture Library (Phase 1 + 1.5)

**Comprehensive Testing Infrastructure:**
1. **authFixtures.js** (~135 lines) - Authentication mocking
2. **apiFixtures.js** (~240 lines) - API response builders
3. **websocketFixtures.js** (~295 lines) - WebSocket simulation
4. **scadaFixtures.js** (enhanced) - SCADA data generators

Total Test Infrastructure: ~670 lines of reusable test utilities

### Final Phase 1 Results (as of 2025-10-25)

- **Baseline Coverage**: 47.91%
- **Final Coverage**: 53.88% (+5.97% improvement) 
- **Target**: 60%+ (Phase 1 Goal - NOT FULLY ACHIEVED)
- **Status**: SIGNIFICANT PROGRESS - All planned tests enabled, infrastructure complete

### Coverage Breakdown
- **Lines**: 53.88% (target: 60%, gap: 6.12%)
- **Functions**: 60.71% (✅ TARGET ACHIEVED)
- **Branches**: 77.98% (✅ EXCEEDS TARGET)
- **Statements**: 53.88% (target: 60%, gap: 6.12%)

### Test Results Summary
- **Total Tests**: 1,370 passing, 10 skipped (out of 1,380)
- **Test Files**: 77 passing (100% pass rate)
- **New Tests Added**: 42 dashboard smoke tests + 10 DeviceStatusDashboard tests = 52 tests
- **Tests Enabled Final Session**: 32 tests (App.test.jsx: 6, useProtocolWebSocket: 10, useRealtimeData: 16)

### Achievements
✅ **ALL TARGETED TESTS ENABLED** - 32 tests across App, hooks, and dashboards
✅ Fixed DeviceStatusDashboard mocking - all 10 tests now passing
✅ Created comprehensive reusable fixture library (~670 lines)
✅ Dashboard smoke tests covering ~2,000+ lines of code
✅ Function coverage target achieved (60.71%)
✅ Branch coverage exceeds target (77.98%)
✅ Zero production code changes
✅ All test files passing (77/77 = 100%)
✅ Coverage improved by 5.97% from baseline

### Remaining Gap Analysis
**Current Coverage**: 53.88%
**Target**: 60%
**Gap**: 6.12%

The remaining gap is due to:
1. Large dashboard components with complex logic not fully exercised by smoke tests
2. Hook code paths that require specific conditions to execute
3. Service layer code that needs integration-level testing

**Next Steps to 60%:**
- Add interaction tests to dashboard components (beyond smoke tests)
- Test additional hook state transitions and edge cases
- Increase service layer test coverage

### Using New Test Fixtures

**Authentication Fixtures Example:**
```javascript
import { 
  createMockUser, 
  createMockAuthContext,
  adminUserContextFixture 
} from '@/tests/fixtures/authFixtures';

// Create custom user
const testUser = createMockUser({ role: 'user', username: 'testuser' });

// Use pre-configured admin context
const authContext = adminUserContextFixture;
```

**API Fixtures Example:**
```javascript
import {
  createMockApiResponse,
  createMockPaginatedResponse,
  apiErrorFixtures
} from '@/tests/fixtures/apiFixtures';

// Mock successful response
const response = createMockApiResponse({ id: 1, name: 'Test' });

// Mock error
const error = apiErrorFixtures.unauthorized;
```

**WebSocket Fixtures Example:**
```javascript
import {
  createMockWebSocket,
  createStreamingDataSimulator,
  generateRealtimeScadaData
} from '@/tests/fixtures/websocketFixtures';

// Create mock WebSocket
const ws = createMockWebSocket('ws://localhost:8080');

// Simulate streaming data
const simulator = createStreamingDataSimulator({
  interval: 16, // 60fps
  generator: generateRealtimeScadaData
});
```

### Coverage Gaps & Next Steps

**To reach 50% (~800 lines needed):**

1. **Priority 1: Auth & API**
   - `authService.js` (38.81% → 80%+) - ~200 lines
   - `apiFetch.js` (56% → 80%+) - ~150 lines

2. **Priority 2: Critical Components**
   - `App.jsx` (69% → 85%+) - ~50 lines
   - Authentication flow components - ~200 lines

3. **Priority 3: Test Infrastructure**
   - `testHelpers.jsx` (49.85% → 80%+) - ~150 lines
   - `scadaFixtures.js` (55% → 80%+) - ~100 lines

**To reach 60% (~3,000 more lines):**

4. **Large Dashboards (partial coverage)**
   - `UserUnitDetails.jsx` (541 lines) - smoke tests
   - `DeviceStatusDashboard.jsx` (289 lines) - basic rendering
   - Protocol dashboards - basic health checks

5. **Complex Hooks**
   - `useRealtimeData.js` (369 lines) - data flow testing
   - `useProtocolWebSocket.js` (278 lines) - connection testing
   - `useRemoteControl.js` (188 lines, 3.7% → 60%+)

**To reach 80% (~9,600 more lines):**

6. **Full Dashboard Coverage**
   - All analytics/performance dashboards
   - Complete protocol management UIs
   - Visualization components

7. **Integration Tests**
   - End-to-end user workflows
   - Multi-component interactions
   - Real-time data scenarios

### Quick Wins for Next Sprint

**Easiest targets (< 1 day each):**

1. ✅ Complete `authService.js` tests
   - Login/logout flows
   - Token management
   - Error handling
   - Impact: ~200 lines

2. ✅ Test `apiFetch.js` utility
   - API call mocking
   - Error scenarios
   - Retry logic
   - Impact: ~150 lines

3. ✅ Improve `App.jsx` coverage
   - Route rendering
   - Provider wrapping
   - Error boundaries
   - Impact: ~50 lines

4. ✅ Test fixture utilities
   - Data generators
   - Mock helpers
   - Impact: ~250 lines

**Total impact**: ~650 lines → Achieves 50% target ✅

### Testing Standards

**All new code must include:**
- ✅ Unit tests for logic
- ✅ Component rendering tests
- ✅ Error scenario coverage
- ✅ Edge case validation

**Target coverage for new features:**
- Critical: 90%+
- Standard: 80%+
- Utilities: 95%+

### Running Coverage

```bash
# Generate coverage report
npm run test:coverage

# Check coverage summary
cat coverage/coverage-summary.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"Lines: {data['total']['lines']['pct']:.2f}%\")
print(f\"Functions: {data['total']['functions']['pct']:.2f}%\")
print(f\"Branches: {data['total']['branches']['pct']:.2f}%\")
"

# View HTML report (not committed)
open coverage/index.html
```

### CI Integration

Coverage runs automatically on:
- All pull requests
- Main branch commits
- Nightly builds

Minimum thresholds (enforced):
- Lines: 45%
- Functions: 55%
- Branches: 75%


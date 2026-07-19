# Testing Guide

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Comprehensive guide to testing ThermaCoreApp components including unit tests, integration tests, and end-to-end testing.

## Table of Contents

1. [Overview](#overview)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Coverage](#test-coverage)

---

## Overview

### Testing Strategy

```
┌─────────────────────────────────────────┐
│         Testing Pyramid                 │
├─────────────────────────────────────────┤
│                                         │
│          E2E Tests (Few)                │
│         /               \               │
│    Integration Tests (Some)             │
│   /                         \           │
│  Unit Tests (Many)                      │
│                                         │
└─────────────────────────────────────────┘
```

**Test Types**:
- **Unit Tests**: Test individual functions/components (70%)
- **Integration Tests**: Test component interactions (20%)
- **E2E Tests**: Test complete user flows (10%)

### Technology Stack

**Backend**:
- `pytest` - Test framework
- `pytest-cov` - Coverage reporting
- `pytest-flask` - Flask testing utilities
- `factory_boy` - Test data factories

**Frontend**:
- `Vitest` - Test runner
- `React Testing Library` - Component testing
- `@testing-library/user-event` - User interaction simulation

---

## Backend Testing

### Test Structure

```
backend/
└── tests/
    ├── conftest.py                    # Shared fixtures
    ├── test_auth.py                   # Authentication tests
    ├── test_user_management.py        # User CRUD tests
    ├── test_roles.py                  # RBAC tests
    ├── test_units.py                  # Unit management tests
    ├── test_sensors.py                # Sensor tests
    ├── test_mqtt_service.py           # MQTT integration tests
    ├── test_opcua_service.py          # OPC UA tests
    └── test_api_endpoints.py          # API integration tests
```

### Running Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_login_success

# Run with coverage
pytest --cov=app --cov-report=html

# Run with verbose output
pytest -v

# Run only failed tests
pytest --lf

# Run tests matching pattern
pytest -k "test_login"
```

### Test Fixtures

> **Note:** The code examples below contain test credentials (e.g., 'TestPass123!') which are examples only for testing purposes. These are NOT real credentials and are safe to include in documentation.

**conftest.py**:
```python
import pytest
from app import create_app, db
from app.models import User, Role

@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Test client"""
    return app.test_client()

@pytest.fixture
def admin_user(app):
    """Create admin user"""
    admin_role = Role.query.filter_by(name='admin').first()
    user = User(
        username='admin_test',
        email='admin@test.com',
        role_id=admin_role.id,
        is_active=True
    )
    user.set_password('TestPass123!')
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def auth_headers(client, admin_user):
    """Get authentication headers"""
    response = client.post('/api/v1/auth/login', json={
        'username': 'admin_test',
        'password': 'TestPass123!'
    })
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}
```

### Example Tests

**test_auth.py**:
```python
import pytest

class TestAuthentication:
    def test_login_success(self, client, admin_user):
        """Test successful login"""
        response = client.post('/api/v1/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPass123!'
        })
        
        assert response.status_code == 200
        assert 'access_token' in response.json
        assert 'refresh_token' in response.json
        assert response.json['user']['username'] == 'admin_test'
    
    def test_login_invalid_credentials(self, client, admin_user):
        """Test login with wrong password"""
        response = client.post('/api/v1/auth/login', json={
            'username': 'admin_test',
            'password': 'WrongPassword'
        })
        
        assert response.status_code == 401
        assert 'error' in response.json
    
    def test_login_inactive_user(self, client, db):
        """Test login with inactive account"""
        user = User(
            username='inactive',
            email='inactive@test.com',
            is_active=False
        )
        user.set_password('Pass123!')
        db.session.add(user)
        db.session.commit()
        
        response = client.post('/api/v1/auth/login', json={
            'username': 'inactive',
            'password': 'Pass123!'
        })
        
        assert response.status_code == 403
        assert 'inactive' in response.json['error'].lower()
```

**test_user_management.py**:
```python
class TestUserManagement:
    def test_create_user(self, client, auth_headers):
        """Test user creation"""
        response = client.post('/api/v1/users', 
            headers=auth_headers,
            json={
                'username': 'newuser',
                'email': 'new@test.com',
                'password': 'NewPass123!',
                'role_id': 2
            }
        )
        
        assert response.status_code == 201
        assert response.json['username'] == 'newuser'
    
    def test_list_users(self, client, auth_headers):
        """Test user listing"""
        response = client.get('/api/v1/users', headers=auth_headers)
        
        assert response.status_code == 200
        assert 'users' in response.json
        assert isinstance(response.json['users'], list)
    
    def test_update_user(self, client, auth_headers, admin_user):
        """Test user update"""
        response = client.put(f'/api/v1/users/{admin_user.id}',
            headers=auth_headers,
            json={'first_name': 'Updated'}
        )
        
        assert response.status_code == 200
        
        # Verify update
        user = User.query.get(admin_user.id)
        assert user.first_name == 'Updated'
```

---

## Frontend Testing

### Test Structure

```
src/
├── components/
│   └── Button.test.jsx
├── pages/
│   └── Dashboard.test.jsx
├── services/
│   └── authService.test.js
└── hooks/
    └── useAuth.test.js
```

### Running Frontend Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/components/Button.test.jsx

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch

# Run UI mode
pnpm test --ui
```

### Example Component Test

**Button.test.jsx**:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDisabled();
  });

  it('applies correct className', () => {
    render(<Button className="custom-class">Click Me</Button>);
    expect(screen.getByText('Click Me')).toHaveClass('custom-class');
  });
});
```

### Example Service Test

> **Note:** The code examples below contain test tokens (e.g., 'token123') which are examples only for testing purposes. These are NOT real credentials.

**authService.test.js**:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';

describe('Auth Service', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('logs in successfully', async () => {
    const mockResponse = {
      access_token: 'token123',
      user: { id: 1, username: 'test' }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await authService.login('test', 'pass123');
    
    expect(result.user.username).toBe('test');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('throws error on failed login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    });

    await expect(
      authService.login('test', 'wrong')
    ).rejects.toThrow('Invalid credentials');
  });
});
```

---

## Writing Tests

### Test Structure (AAA Pattern)

```python
def test_example():
    # Arrange - Set up test data
    user = create_user(username='test')
    
    # Act - Perform the action
    result = user.authenticate('password123')
    
    # Assert - Verify the outcome
    assert result is True
```

### Good Test Practices

**✅ DO**:
- Test one thing per test
- Use descriptive test names
- Keep tests independent
- Clean up after tests
- Use fixtures for common setup

**❌ DON'T**:
- Test implementation details
- Make tests dependent on each other
- Use hardcoded values without context
- Skip cleanup
- Write overly complex tests

### Parameterized Tests

```python
import pytest

@pytest.mark.parametrize('username,email,expected', [
    ('user1', 'user1@test.com', True),
    ('user2', 'user2@test.com', True),
    ('', 'empty@test.com', False),
    ('user3', 'invalid-email', False),
])
def test_user_validation(username, email, expected):
    user = User(username=username, email=email)
    assert user.is_valid() == expected
```

### Mocking External Services

```python
from unittest.mock import Mock, patch

def test_mqtt_message_handler():
    # Mock MQTT client
    mock_client = Mock()
    
    with patch('app.services.mqtt_service.MQTTClient', 
               return_value=mock_client):
        service = MQTTService()
        service.publish('test/topic', {'value': 42})
        
        mock_client.publish.assert_called_once_with(
            'test/topic',
            '{"value": 42}'
        )
```

---

## Testing Data Visualization Components

### Overview

Data visualization components (charts, graphs, diagrams) require special testing approaches due to their use of canvas, SVG, and third-party charting libraries like Recharts. This section covers best practices for testing visualization components effectively.

### Mocking Chart Libraries

**Recharts Mocking**:
```javascript
// Mock Recharts components to avoid canvas/SVG complexity in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));
```

**Canvas Context Mocking**:
```javascript
// For canvas-based components (from testHelpers.jsx)
export function setupMockCanvas() {
  const mockContext = createMockCanvasContext();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
  return mockContext;
}

export function createMockCanvasContext() {
  const styleHistory = {
    strokeStyle: [],
    fillStyle: [],
  };

  const context = {
    _styleHistory: styleHistory,
    lineWidth: 1,
    lineCap: "butt",
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    // ... other canvas methods
  };

  // Track style changes
  Object.defineProperty(context, "strokeStyle", {
    get() { return this._strokeStyle; },
    set(value) {
      this._strokeStyle = value;
      this._styleHistory.strokeStyle.push(value);
    },
  });

  return context;
}
```

### Testing Patterns

**Basic Component Rendering**:
```javascript
describe("VitalSignGraph", () => {
  it("should render chart with data", () => {
    render(<VitalSignGraph title="Temperature" dataKey="temp" color="#ff0000" />);
    
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("should handle empty data", () => {
    render(<VitalSignGraph data={[]} />);
    
    const chart = screen.getByTestId("line-chart");
    expect(chart).toHaveAttribute("data-length", "0");
  });
});
```

**Interactive Features**:
```javascript
describe("Chart Interactions", () => {
  it("should handle node clicks", () => {
    const onClick = vi.fn();
    render(<ProcessFlowDiagram nodes={mockNodes} onNodeClick={onClick} />);
    
    const node = screen.getByText("Node 1").closest('[role="button"]');
    fireEvent.click(node);
    
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: "node1" }));
  });

  it("should support keyboard navigation", () => {
    const onClick = vi.fn();
    render(<ProcessFlowDiagram nodes={mockNodes} onNodeClick={onClick} />);
    
    const node = screen.getByText("Node 1").closest('[role="button"]');
    fireEvent.keyDown(node, { key: "Enter", code: "Enter" });
    
    expect(onClick).toHaveBeenCalled();
  });
});
```

**Color Schemes and Theming**:
```javascript
describe("Dark Mode Support", () => {
  it("should apply dark mode styles", () => {
    document.documentElement.classList.add("dark");
    
    const { container } = render(<IndustrialGauge value={50} />);
    
    // Verify dark mode colors are applied
    expect(mockContext._styleHistory.strokeStyle).toContain("#374151");
    
    document.documentElement.classList.remove("dark");
  });

  it("should update on theme change", () => {
    const { rerender } = render(<MultiTimeframeTrendChart />);
    
    document.documentElement.classList.add("dark");
    rerender(<MultiTimeframeTrendChart />);
    
    // Component should re-render with dark theme
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    
    document.documentElement.classList.remove("dark");
  });
});
```

**Empty States and Loading**:
```javascript
describe("Edge Cases", () => {
  it("should handle missing data gracefully", () => {
    render(<ProcessFlowDiagram nodes={mockNodes} liveData={{}} />);
    
    // Should still render without live data
    expect(screen.getByText("Node 1")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<ChartComponent loading={true} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

**Performance with Large Datasets**:
```javascript
describe("Performance", () => {
  it("should handle large datasets", () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      timestamp: Date.now() - i * 60000,
      value: Math.random() * 100,
    }));
    
    render(<MultiTimeframeTrendChart data={largeData} metrics={mockMetrics} />);
    
    const chart = screen.getByTestId("line-chart");
    expect(chart).toHaveAttribute("data-length", "1000");
  });

  it("should rerender efficiently", () => {
    const { rerender } = render(<VitalSignGraph title="V1" />);
    
    for (let i = 0; i < 10; i++) {
      rerender(<VitalSignGraph title={`V${i}`} />);
    }
    
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
```

### Accessibility Testing

**ARIA Attributes**:
```javascript
describe("Accessibility", () => {
  it("should have accessible structure", () => {
    const { container } = render(<IndustrialGauge title="Pressure Gauge" />);
    
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toBeTruthy();
  });

  it("should have keyboard-accessible nodes", () => {
    const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);
    
    const buttons = container.querySelectorAll('[role="button"]');
    const accessibleButtons = Array.from(buttons).filter(
      btn => btn.getAttribute("tabindex") === "0"
    );
    
    expect(accessibleButtons.length).toBe(mockNodes.length);
  });

  it("should have descriptive labels", () => {
    render(<MultiTimeframeTrendChart title="Temperature Trend" />);
    
    expect(screen.getByText("Temperature Trend")).toBeInTheDocument();
  });
});
```

### Best Practices

1. **Mock Complex Libraries**: Mock canvas/chart libraries to keep tests fast and deterministic
2. **Test Core Functionality**: Focus on data rendering, interactions, and state changes
3. **Keep Tests Fast**: Avoid full rendering of complex charts; use mocks and data attributes
4. **Test Accessibility**: Verify ARIA roles, keyboard navigation, and screen reader support
5. **Avoid Flaky Tests**: Don't rely on Select component interactions in test environment
6. **Snapshot Judiciously**: Use snapshots for simple components, not complex visualizations
7. **Test Edge Cases**: Empty data, null values, rapid updates, large datasets
8. **Theme Testing**: Verify dark/light mode support and color contrast

### Example Test Files

- `src/tests/VitalSignGraph.test.jsx` - Recharts LineChart testing
- `src/tests/chart.test.jsx` - Chart wrapper components (ChartContainer, ChartTooltip, ChartLegend)
- `src/tests/MultiTimeframeTrendChart.test.jsx` - Complex multi-chart component
- `src/tests/ProcessFlowDiagram.test.jsx` - SVG-based interactive diagram
- `src/tests/IndustrialGauge.test.jsx` - Canvas-based gauge component

### Common Pitfalls

1. **Radix UI Select**: Complex dropdown interactions may fail in test environment - test basic rendering only
2. **Canvas Context**: Always mock `getContext()` before rendering canvas components
3. **Async Updates**: Use `waitFor()` for components with animations or async data loading
4. **Memory Leaks**: Clean up timers and observers in component unmount tests
5. **Color Validation**: Use style history tracking rather than DOM inspection for canvas colors

---

## Data Management Component Testing

### Overview

Data management components (GridView, HistoryView, DataTable, etc.) handle complex data operations including filtering, sorting, pagination, and search. These components require comprehensive testing to ensure data integrity and user experience.

### Testing Patterns for Data Components

**GridView and Data Grids**:
```javascript
describe("GridView", () => {
  it("should filter data by search term", async () => {
    const mockUnits = [/* mock data */];
    mockUseUnits.mockReturnValue({ units: mockUnits, loading: false });
    
    render(<GridView />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "Unit 001" } });
    
    await waitFor(() => {
      expect(screen.getByText("Unit 001")).toBeInTheDocument();
      expect(screen.queryByText("Unit 002")).not.toBeInTheDocument();
    });
  });
  
  it("should handle pagination with load more", async () => {
    render(<GridView />);
    
    const loadMoreButton = screen.getByText(/load more/i);
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      const items = screen.getAllByText(/Unit/);
      expect(items.length).toBeGreaterThan(5);
    });
  });
  
  it("should apply multiple filters simultaneously", async () => {
    render(<GridView />);
    
    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "Client A" } });
    
    // Apply status filter
    const statusSelect = screen.getByRole("combobox");
    fireEvent.change(statusSelect, { target: { value: "Online" } });
    
    await waitFor(() => {
      // Should show only online units from Client A
      expect(screen.getByText("Unit 001")).toBeInTheDocument();
    });
  });
});
```

**History and Event Lists**:
```javascript
describe("HistoryView", () => {
  it("should load and display event history", async () => {
    const mockEvents = [/* event data */];
    vi.mocked(getEventHistory).mockResolvedValue(mockEvents);
    
    render(<HistoryView />);
    
    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });
  });
  
  it("should handle API errors gracefully", async () => {
    vi.mocked(getEventHistory).mockRejectedValue(new Error("API Error"));
    
    render(<HistoryView />);
    
    await waitFor(() => {
      // Should still render with fallback data
      expect(screen.getByText("Event History")).toBeInTheDocument();
    });
  });
  
  it("should classify events by severity", async () => {
    const { container } = render(<HistoryView />);
    
    await waitFor(() => {
      const errorCards = container.querySelectorAll(".border-l-red-500");
      const warningCards = container.querySelectorAll(".border-l-yellow-500");
      expect(errorCards.length).toBeGreaterThan(0);
      expect(warningCards.length).toBeGreaterThan(0);
    });
  });
});
```

**Performance with Large Datasets**:
```javascript
describe("Performance Testing", () => {
  it("should handle 100+ items efficiently", () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      // ... other fields
    }));
    
    mockUseData.mockReturnValue({ data: largeDataset });
    
    const startTime = performance.now();
    render(<DataComponent />);
    const endTime = performance.now();
    
    // Should render within 1 second
    expect(endTime - startTime).toBeLessThan(1000);
    expect(screen.getByText("Item 0")).toBeInTheDocument();
  });
  
  it("should filter large datasets quickly", async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));
    
    mockUseData.mockReturnValue({ data: largeDataset });
    render(<DataComponent />);
    
    const searchInput = screen.getByRole("textbox");
    const startTime = performance.now();
    fireEvent.change(searchInput, { target: { value: "Item 10" } });
    const endTime = performance.now();
    
    // Filtering should be nearly instant
    expect(endTime - startTime).toBeLessThan(100);
  });
});
```

### Best Practices for Data Components

1. **Mock Context Hooks**: Use `vi.mock()` to mock context hooks like `useUnits`, `useAuth`
2. **Test All Filter Combinations**: Ensure search + status + type filters work together
3. **Pagination Testing**: Test initial load, load more, and "all loaded" states
4. **Empty States**: Test behavior with no data, loading states, and error states
5. **URL Parameter Handling**: Test that URL parameters correctly initialize filters
6. **Case-Insensitive Search**: Verify search works regardless of case
7. **Performance**: Test with realistic large datasets (100-1000 items)
8. **Role-Based Filtering**: Test that users see appropriate data based on permissions

---

## Settings and Configuration Testing

### Overview

Settings components handle form inputs, toggles, validation, and persistence. Testing should ensure correct state management, validation, and user interactions.

### Form Testing Patterns

**Toggle Settings**:
```javascript
describe("NotificationSettings", () => {
  it("should toggle notification preferences", () => {
    const mockHandleChange = vi.fn();
    const settings = {
      notifications: { email: true, push: false }
    };
    
    render(
      <NotificationSettings 
        settings={settings}
        handleSettingChange={mockHandleChange}
      />
    );
    
    const emailToggle = screen.getAllByRole("button")[0];
    fireEvent.click(emailToggle);
    
    expect(mockHandleChange).toHaveBeenCalledWith(
      "notifications",
      "email",
      false
    );
  });
  
  it("should show correct initial toggle states", () => {
    const settings = {
      notifications: { email: true, push: false }
    };
    
    const { container } = render(
      <NotificationSettings settings={settings} />
    );
    
    const toggles = container.querySelectorAll("button");
    // Email is enabled - should have bg-blue-600
    expect(toggles[0].className).toMatch(/bg-blue-600/);
    // Push is disabled - should have bg-gray
    expect(toggles[1].className).toMatch(/bg-gray/);
  });
});
```

**Form Inputs and Validation**:
```javascript
describe("DataRefreshSettings", () => {
  it("should update refresh interval", () => {
    const mockHandleChange = vi.fn();
    const settings = {
      dataRefresh: { autoRefresh: true, refreshInterval: 30 }
    };
    
    render(
      <DataRefreshSettings 
        settings={settings}
        handleSettingChange={mockHandleChange}
      />
    );
    
    const intervalInput = screen.getByLabelText("Refresh Interval (seconds)");
    fireEvent.change(intervalInput, { target: { value: "60" } });
    
    expect(mockHandleChange).toHaveBeenCalledWith(
      "dataRefresh",
      "refreshInterval",
      "60"
    );
  });
  
  it("should conditionally show fields based on toggles", () => {
    const settingsWithAutoRefresh = {
      dataRefresh: { autoRefresh: true, refreshInterval: 30 }
    };
    
    const { rerender } = render(
      <DataRefreshSettings settings={settingsWithAutoRefresh} />
    );
    
    expect(screen.getByLabelText("Refresh Interval")).toBeInTheDocument();
    
    const settingsWithoutAutoRefresh = {
      dataRefresh: { autoRefresh: false, refreshInterval: 30 }
    };
    
    rerender(
      <DataRefreshSettings settings={settingsWithoutAutoRefresh} />
    );
    
    expect(screen.queryByLabelText("Refresh Interval")).not.toBeInTheDocument();
  });
});
```

**Select Inputs**:
```javascript
describe("DisplaySettings", () => {
  it("should update theme selection", () => {
    const mockHandleChange = vi.fn();
    const settings = { display: { theme: "light" } };
    
    render(
      <DisplaySettings 
        settings={settings}
        handleSettingChange={mockHandleChange}
      />
    );
    
    const themeSelect = screen.getByLabelText("Theme");
    fireEvent.change(themeSelect, { target: { value: "dark" } });
    
    expect(mockHandleChange).toHaveBeenCalledWith(
      "display",
      "theme",
      "dark"
    );
  });
  
  it("should render all available options", () => {
    const settings = { display: { theme: "light" } };
    
    render(<DisplaySettings settings={settings} />);
    
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Auto (System)")).toBeInTheDocument();
  });
});
```

### Settings Testing Best Practices

1. **Test Toggle States**: Verify both on and off states render correctly
2. **Conditional Rendering**: Test fields that show/hide based on other settings
3. **Default Values**: Test that components render with appropriate defaults
4. **Independent Settings**: Ensure changes to one setting don't affect others
5. **Callback Verification**: Verify `handleSettingChange` called with correct params
6. **Form Structure**: Test that labels, inputs, and descriptions are properly associated
7. **Multiple Updates**: Test that multiple rapid changes are handled correctly

---

## Form Testing Best Practices

### Form Validation

```javascript
describe("Form Validation", () => {
  it("should validate required fields", async () => {
    render(<RegistrationForm />);
    
    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
  
  it("should validate email format", async () => {
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    
    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });
});
```

### Form Submission

```javascript
describe("Form Submission", () => {
  it("should call onSubmit with form data", async () => {
    const mockOnSubmit = vi.fn();
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "John Doe" }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "john@example.com" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com"
      });
    });
  });
  
  it("should handle submission errors", async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(
      new Error("Submission failed")
    );
    
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "John Doe" }
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });
});
```

### Reset and Default Behavior

```javascript
describe("Form Reset", () => {
  it("should reset to default values", () => {
    const defaultValues = {
      name: "",
      email: "",
      notifications: true
    };
    
    render(<SettingsForm defaultValues={defaultValues} />);
    
    // Modify values
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "John" }
    });
    fireEvent.click(screen.getByLabelText(/notifications/i));
    
    // Reset
    const resetButton = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetButton);
    
    // Verify reset
    expect(screen.getByLabelText(/name/i)).toHaveValue("");
    expect(screen.getByLabelText(/notifications/i)).toBeChecked();
  });
});
```

---

## Test Coverage

### Generate Coverage Report

```bash
# Backend
cd backend
pytest --cov=app --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html

# Frontend
pnpm test --coverage
open coverage/index.html
```

### Coverage Goals

- **Overall**: > 71% (current: 71.25%)
- **Critical paths**: > 95% (auth, permissions, data storage)
- **Business logic**: > 85%
- **UI components**: > 60%

### Coverage Report Example

```
Name                          Stmts   Miss  Cover
-------------------------------------------------
app/__init__.py                  45      2    96%
app/models/user.py               78      5    94%
app/routes/auth.py              120      8    93%
app/routes/users.py             156     18    88%
app/services/mqtt_service.py     89     25    72%
-------------------------------------------------
TOTAL                          1245    358   71.25%
```

---

## Continuous Integration

### GitHub Actions Workflows

The project uses multiple parallel workflows for faster CI/CD execution:

**Test Workflows**:
- **`build-and-test.yml`** - Backend and database tests
- **`frontend-quality.yml`** - Frontend tests, type checking, and quality checks
- **`frontend-coverage-gate.yml`** - Frontend coverage enforcement (60% threshold)
- **`backend-coverage-gate.yml`** - Backend coverage enforcement (60% threshold)

**Quality Gate Workflows**:
- **`python-security.yml`** - Python linting and security (Ruff, Bandit)
- **`backend-quality-gate.yml`** - Backend quality checks (Ruff, mypy, complexity)
- **`frontend-quality-gate.yml`** - Frontend quality checks (TypeScript, Biome, Build)
- **`security-quality-gate.yml`** - Security scanning (Bandit, Gitleaks)
- **`dependency-security.yml`** - Dependency and secret scanning (Gitleaks, OSV)
- **`performance-quality-gate.yml`** - Performance benchmarks

All workflows run in parallel for faster feedback (~60% faster than monolithic workflows).

---

## Enterprise Quality Standards

### Overview

The ThermaCore SCADA platform implements comprehensive enterprise quality standards to ensure production readiness, security, and reliability.

### Quality Gates

All code changes must pass through automated quality gates:

1. **Security Gate**
   - Bandit security vulnerability scanning
   - Secret scanning with Gitleaks
   - Zero high-severity vulnerabilities allowed
   - Medium-severity vulnerabilities reviewed

2. **Backend Gate**
   - Ruff linting (< 100 issues)
   - Code formatting verification
   - Type checking with MyPy
   - Cyclomatic complexity analysis (avg < 10)

3. **Frontend Gate**
   - TypeScript type checking (zero errors)
   - Biome linting and formatting
   - Build verification
   - Bundle size analysis

4. **Test Coverage Gate**
   - Backend coverage: ≥ 60% (current: 63% with 795 tests, target: 70%+)
   - Frontend coverage: ≥ 35% (realistic threshold for early-stage frontend development)
   - All tests must pass

5. **Performance Gate**
   - Protocol performance benchmarks
   - Critical path benchmarks
   - API response time validation

### Code Quality Metrics

**Acceptable Thresholds:**

| Metric | Target | Minimum |
|--------|--------|---------|
| Test Coverage (Backend) | 80% | 63% minimum |
| Test Coverage (Frontend) | 70% | 40% minimum |
| Cyclomatic Complexity (Average) | < 5 | < 15 |
| High Complexity Functions | 0 | < 5 |
| Security Vulnerabilities (High) | 0 | 0 |
| Security Vulnerabilities (Medium) | 0 | < 5 |
| Code Quality Issues | < 50 | < 100 |

**Note**: The complexity threshold of 15 acknowledges that SCADA protocol services and industrial control systems have legitimate complexity needs due to protocol state machines, safety interlocks, and real-time processing requirements. Strategic complexity allowances are configured in `pyproject.toml` for specific protocol service files.

### Security Standards

**Security Requirements:**

1. **Environment Variables**
   - SECRET_KEY: ≥ 32 characters, cryptographically random
   - JWT_SECRET_KEY: ≥ 32 characters, cryptographically random
   - No test/default values in production

2. **HTTPS & Transport Security**
   - FORCE_HTTPS enabled in production
   - TLS 1.2 or higher for all connections
   - Secure cookie attributes (HttpOnly, Secure, SameSite)

3. **CORS Configuration**
   - Restricted origins (no wildcards in production)
   - Specific allowed methods
   - Credential support properly configured

4. **Database Security**
   - PostgreSQL with SSL connections
   - Connection pooling configured
   - No localhost connections in production
   - Prepared statements for all queries

5. **Dependency Security**
   - Regular dependency updates
   - Vulnerability scanning with OSV Scanner
   - No known high-severity vulnerabilities
   - Automated Dependabot updates

---

## Enterprise Workflow

### Quality Gates Workflows

The enterprise quality gates are now split into separate, parallel workflows for faster execution:

**Workflow Files:**

1. **Security Quality Gate**: `.github/workflows/security-quality-gate.yml`
   - Security vulnerability scanning (Bandit, Gitleaks)
   - Runs on every PR, push to main, and daily at 2 AM UTC

2. **Backend Quality Gate**: `.github/workflows/backend-quality-gate.yml`
   - Backend code quality checks (Ruff, mypy, complexity analysis)
   - Runs on every PR, push to main, and daily at 2 AM UTC

3. **Frontend Quality Gate**: `.github/workflows/frontend-quality-gate.yml`
   - Frontend quality checks (TypeScript, Biome, build verification)
   - Runs on every PR, push to main, and daily at 2 AM UTC

4. **Test Coverage Gate**: `.github/workflows/test-coverage-gate.yml`
   - Test coverage validation (frontend & backend with 60% thresholds)
   - Runs on every PR, push to main, and daily at 2 AM UTC

5. **Performance Quality Gate**: `.github/workflows/performance-quality-gate.yml`
   - Performance benchmarks and response time checks
   - Runs on every PR, push to main, and daily at 2 AM UTC

All workflows run in parallel for faster feedback on pull requests.

### Running Quality Checks Locally

```bash
# Security checks
cd backend
bandit -r app -c .bandit

# Code quality
ruff check app
ruff format --check app

# Type checking
mypy app --ignore-missing-imports

# Complexity analysis
radon cc app -a -nb
radon mi app -nb

# Run all static analysis
python scripts/static_analysis_suite.py

# Production readiness check
python scripts/production_readiness.py --skip-services
```

### Performance Benchmarking

```bash
cd backend

# Protocol performance benchmarks
python benchmarks/protocol_performance.py

# Critical path benchmarks
python benchmarks/critical_path_benchmark.py
```

**Benchmark Targets:**

| Benchmark | Target | Threshold |
|-----------|--------|-----------|
| Message Serialization | < 10ms | < 10ms |
| Message Deserialization | < 10ms | < 10ms |
| Protocol Registry Lookup | < 1ms | < 1ms |
| Message Validation | < 5ms | < 5ms |
| Complete Message Processing | < 50ms | < 50ms |
| User Authentication | < 100ms | < 100ms |
| Sensor Data Ingestion | < 50ms | < 50ms |
| Real-time Data Query | < 200ms | < 200ms |
| Alert Processing | < 100ms | < 100ms |
| Dashboard Aggregation | < 500ms | < 500ms |

### Static Analysis Suite

The static analysis suite provides comprehensive code quality analysis:

```bash
cd backend

# Run full analysis suite
python scripts/static_analysis_suite.py

# Run with strict mode (warnings as errors)
python scripts/static_analysis_suite.py --fail-on-medium

# Custom output directory
python scripts/static_analysis_suite.py --output-dir custom_reports
```

**Analysis Components:**

1. **Security Scanning (Bandit)**
   - Scans for security vulnerabilities
   - Reports by severity (HIGH, MEDIUM, LOW)
   - Generates JSON report

2. **Code Quality (Ruff)**
   - Linting and style checks
   - Code formatting verification
   - Counts and categorizes issues

3. **Complexity Analysis (Radon)**
   - Cyclomatic complexity
   - Maintainability index
   - Identifies complex functions

4. **Import Analysis**
   - Import usage tracking
   - Dependency analysis
   - Identifies unused imports

**Output Files:**
- `analysis_reports/bandit_report.json`
- `analysis_reports/ruff_report.txt`
- `analysis_reports/complexity_report.txt`
- `analysis_reports/import_analysis.txt`
- `analysis_reports/analysis_summary.json`

---

## Maintenance Procedures

### Daily Maintenance

1. **Automated Checks**
   - Enterprise quality gates run daily at 2 AM UTC
   - Review GitHub Actions workflow results
   - Address any failures immediately

2. **Monitoring**
   - Check application logs for errors
   - Monitor performance metrics
   - Review security scan results

### Weekly Maintenance

1. **Dependency Updates**
   - Review Dependabot PRs
   - Test and merge security updates
   - Update non-security dependencies as needed

2. **Performance Review**
   - Run performance benchmarks
   - Compare against historical data
   - Investigate any regressions

3. **Code Quality Review**
   - Run static analysis suite
   - Address new quality issues
   - Refactor high-complexity code

### Monthly Maintenance

1. **Comprehensive Testing**
   - Full test suite execution
   - Manual testing of critical paths
   - Load testing (if applicable)

2. **Security Audit**
   - Review security scan results
   - Update security policies
   - Audit access logs

3. **Documentation Updates**
   - Update API documentation
   - Review and update operational docs
   - Update runbooks

### Pre-Release Checklist

Before deploying to production:

```bash
# 1. Run production readiness validation
cd backend
python scripts/production_readiness.py

# 2. Run all benchmarks
python benchmarks/protocol_performance.py
python benchmarks/critical_path_benchmark.py

# 3. Run static analysis
python scripts/static_analysis_suite.py --fail-on-medium

# 4. Run full test suite
pytest --cov=app --cov-report=term -v

# 5. Check for security vulnerabilities
bandit -r app -c .bandit

# 6. Verify environment configuration
# Review all environment variables
# Ensure secrets are properly configured
# Verify database connectivity

# 7. Database migrations
flask db upgrade

# 8. Backup verification
# Ensure recent backups exist
# Test restore procedure (in staging)
```

### Rollback Procedures

If issues are detected in production:

1. **Immediate Actions**
   - Assess severity and impact
   - Notify stakeholders
   - Prepare rollback if necessary

2. **Rollback Steps**
   ```bash
   # Revert to previous version
   git revert <commit-hash>
   
   # Or checkout previous tag
   git checkout <previous-tag>
   
   # Rebuild and deploy
   # Follow deployment procedures
   ```

3. **Database Rollback**
   ```bash
   # Downgrade migrations if needed
   flask db downgrade
   
   # Restore from backup (if necessary)
   # Follow backup restore procedures
   ```

4. **Post-Rollback**
   - Verify system functionality
   - Monitor for continued issues
   - Analyze root cause
   - Implement fixes and test thoroughly

### Incident Response

1. **Detection**
   - Automated alerts from monitoring
   - User reports
   - Quality gate failures

2. **Assessment**
   - Determine severity and scope
   - Identify affected components
   - Estimate recovery time

3. **Response**
   - Execute appropriate procedures
   - Communicate with stakeholders
   - Document actions taken

4. **Recovery**
   - Implement fixes
   - Validate resolution
   - Monitor for recurrence

5. **Post-Incident**
   - Conduct retrospective
   - Update procedures
   - Implement preventive measures

---

**Related Documentation:**
- [Setup Guide](../DEVELOPMENT/SETUP_GUIDE.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Contributing Guidelines](../DEVELOPMENT/CONTRIBUTING.md)
- [Enterprise Readiness Report](ENTERPRISE_READINESS_REPORT.md)

*Last Updated: October 2024*

---

## Navigation & Routing Testing Patterns

### Overview

Navigation and routing components are critical for user experience and application flow. This section covers best practices for testing navigation menus, route guards, and routing behavior.

### Testing Navigation Components

**SideNavigation and Mobile Navigation**:
```javascript
describe("Navigation Component", () => {
  it("should render all navigation items", () => {
    render(<Navigation />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Units")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should navigate to correct route on click", async () => {
    const navigate = vi.fn();
    render(<Navigation navigate={navigate} />);
    
    fireEvent.click(screen.getByText("Dashboard"));
    
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should highlight active route", () => {
    render(<Navigation currentPath="/dashboard" />);
    
    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.closest("button")).toHaveClass("active");
  });

  it("should be keyboard navigable", () => {
    render(<Navigation />);
    
    const firstLink = screen.getByText("Dashboard");
    firstLink.focus();
    
    expect(document.activeElement).toBe(firstLink);
  });
});
```

**Route Guards and Protected Routes**:
```javascript
describe("ProtectedRoute", () => {
  it("should redirect to login when not authenticated", () => {
    const { container } = render(
      <ProtectedRoute isAuthenticated={false}>
        <ProtectedContent />
      </ProtectedRoute>
    );
    
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should render content when authenticated", () => {
    render(
      <ProtectedRoute isAuthenticated={true}>
        <ProtectedContent />
      </ProtectedRoute>
    );
    
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("should enforce role-based access", () => {
    render(
      <ProtectedRoute 
        isAuthenticated={true}
        userRole="user"
        requiredRoles={["admin"]}
      >
        <AdminContent />
      </ProtectedRoute>
    );
    
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });
});
```

### Testing Dynamic Routes

**URL Parameter Handling**:
```javascript
describe("Dynamic Routes", () => {
  it("should extract route parameters", () => {
    const { result } = renderHook(() => useParams(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/units/123"]}>
          <Routes>
            <Route path="/units/:id" element={children} />
          </Routes>
        </MemoryRouter>
      ),
    });
    
    expect(result.current.id).toBe("123");
  });

  it("should handle missing parameters gracefully", () => {
    render(<UnitDetails unitId={null} />);
    
    expect(screen.getByText("Unit not found")).toBeInTheDocument();
  });
});
```

### Best Practices for Navigation Testing

1. **Test All Navigation Paths**: Verify every navigation item and route
2. **Verify Active States**: Test visual indication of current route
3. **Test Role-Based Navigation**: Ensure menu items respect user permissions
4. **Keyboard Navigation**: Verify tab order and keyboard shortcuts
5. **Responsive Navigation**: Test mobile and desktop navigation separately
6. **Loading States**: Test navigation during async route changes
7. **Error States**: Test handling of invalid routes (404 pages)
8. **Browser History**: Verify back/forward navigation works correctly

---

## Form & Authentication Testing Strategies

### Overview

Forms and authentication flows require comprehensive testing to ensure data validation, submission handling, and security measures work correctly.

### Form Testing Patterns

**Basic Form Rendering and Input**:
```javascript
describe("LoginForm", () => {
  it("should render all form fields", () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("should update field values on input", () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText("Username");
    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    
    expect(usernameInput).toHaveValue("testuser");
  });
});
```

**Form Validation**:
```javascript
describe("Form Validation", () => {
  it("should show validation errors for empty fields", async () => {
    render(<RegistrationForm />);
    
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    
    await waitFor(() => {
      expect(screen.getByText("Username is required")).toBeInTheDocument();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("should validate email format", async () => {
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    });
  });

  it("should validate password strength", async () => {
    render(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
    });
  });
});
```

**Form Submission**:
```javascript
describe("Form Submission", () => {
  it("should call onSubmit with form data", async () => {
    const mockOnSubmit = vi.fn();
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "John Doe" }
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "john@example.com" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com"
      });
    });
  });

  it("should show loading state during submission", async () => {
    const mockOnSubmit = vi.fn(() => new Promise(resolve => 
      setTimeout(resolve, 1000)
    ));
    
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    fillForm(); // Helper to fill required fields
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    
    expect(screen.getByText("Submitting...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("should display error on submission failure", async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(
      new Error("Submission failed")
    );
    
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    
    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });
  });
});
```

### Authentication Flow Testing

**Login Process**:
```javascript
describe("Authentication", () => {
  it("should authenticate user with valid credentials", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    render(<LoginScreen login={mockLogin} />);
    
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "admin" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" }
    });
    
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin", "password123");
    });
  });

  it("should show error for invalid credentials", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: false,
      error: "Invalid credentials"
    });
    
    render(<LoginScreen login={mockLogin} />);
    
    fillLoginForm("admin", "wrongpassword");
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
```

**Password Visibility Toggle**:
```javascript
describe("Password Field", () => {
  it("should toggle password visibility", () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    
    const toggleButton = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggleButton);
    
    expect(passwordInput).toHaveAttribute("type", "text");
  });
});
```

### Form Best Practices

1. **Test All Field Types**: Text, email, password, checkbox, radio, select
2. **Validation Coverage**: Required fields, format validation, custom rules
3. **Error Messages**: Verify all error messages display correctly
4. **Accessibility**: Test labels, ARIA attributes, keyboard navigation
5. **Auto-fill Testing**: Test browser auto-fill compatibility
6. **Multi-Step Forms**: Test navigation between steps and state persistence
7. **File Upload**: Test file selection, validation, and error handling
8. **Form Reset**: Test clear/reset functionality

---

## Context/Service Integration Testing

### Overview

Context providers and services manage global state and side effects. Testing their integration ensures data flows correctly through the application.

### Testing Context Providers

**Settings Context**:
```javascript
describe("SettingsContext", () => {
  it("should provide default settings", () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider
    });
    
    expect(result.current.settings.soundEnabled).toBe(true);
    expect(result.current.settings.volume).toBe(0.35);
  });

  it("should load settings from localStorage", () => {
    localStorage.setItem("settings", JSON.stringify({
      soundEnabled: false,
      volume: 0.5
    }));
    
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider
    });
    
    expect(result.current.settings.soundEnabled).toBe(false);
    expect(result.current.settings.volume).toBe(0.5);
  });

  it("should update settings", () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider
    });
    
    act(() => {
      result.current.toggleSound();
    });
    
    expect(result.current.settings.soundEnabled).toBe(false);
  });

  it("should persist settings to localStorage", () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider
    });
    
    act(() => {
      result.current.setVolume(0.8);
    });
    
    const saved = JSON.parse(localStorage.getItem("settings"));
    expect(saved.volume).toBe(0.8);
  });
});
```

**Theme Context**:
```javascript
describe("ThemeContext", () => {
  it("should toggle theme", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    act(() => {
      result.current.setTheme("dark");
    });
    
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should detect system theme preference", () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    act(() => {
      result.current.setTheme("auto");
    });
    
    expect(result.current.actualTheme).toBe("dark");
  });
});
```

### Testing Service Integration

**API Service Mocking**:
```javascript
describe("API Service Integration", () => {
  it("should fetch data and update state", async () => {
    const mockData = [{ id: 1, name: "Unit 001" }];
    vi.spyOn(unitService, "getUnits").mockResolvedValue(mockData);
    
    render(<UnitList />);
    
    await waitFor(() => {
      expect(screen.getByText("Unit 001")).toBeInTheDocument();
    });
  });

  it("should handle API errors gracefully", async () => {
    vi.spyOn(unitService, "getUnits").mockRejectedValue(
      new Error("Network error")
    );
    
    render(<UnitList />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading units/i)).toBeInTheDocument();
    });
  });
});
```

### Context Integration Best Practices

1. **Provider Composition**: Test multiple providers together
2. **State Synchronization**: Verify context updates trigger re-renders
3. **Persistence**: Test localStorage/sessionStorage integration
4. **Error Boundaries**: Test error handling in context providers
5. **Performance**: Avoid unnecessary re-renders with proper memoization
6. **Type Safety**: Ensure context values match expected types
7. **Default Values**: Test behavior when context is not provided

---

## Performance Testing Best Practices

### Overview

Performance testing ensures the application remains responsive under various load conditions and with large datasets.

### Component Performance Testing

**Render Performance**:
```javascript
describe("Performance", () => {
  it("should render large lists efficiently", () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      value: Math.random() * 100
    }));
    
    const startTime = performance.now();
    render(<DataGrid data={largeDataset} />);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(1000); // < 1 second
    expect(screen.getByText("Item 0")).toBeInTheDocument();
  });

  it("should handle rapid updates without lag", async () => {
    const { rerender } = render(<LiveChart data={[]} />);
    
    for (let i = 0; i < 60; i++) {
      const data = Array.from({ length: 100 }, (_, j) => ({
        timestamp: Date.now() - j * 1000,
        value: Math.random() * 100
      }));
      
      const startTime = performance.now();
      rerender(<LiveChart data={data} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(16); // < 16ms for 60fps
    }
  });
});
```

**Memory Leak Detection**:
```javascript
describe("Memory Management", () => {
  it("should clean up event listeners on unmount", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    
    const { unmount } = render(<Component />);
    
    const addCallCount = addEventListener.mock.calls.length;
    
    unmount();
    
    const removeCallCount = removeEventListener.mock.calls.length;
    expect(removeCallCount).toBe(addCallCount);
  });

  it("should cancel pending requests on unmount", async () => {
    const abortController = new AbortController();
    vi.spyOn(abortController, "abort");
    
    const { unmount } = render(<DataFetcher />);
    
    unmount();
    
    await waitFor(() => {
      expect(abortController.abort).toHaveBeenCalled();
    });
  });
});
```

### Throttling and Debouncing

**Search Input Performance**:
```javascript
describe("Search Performance", () => {
  it("should debounce search input", async () => {
    const mockSearch = vi.fn();
    render(<SearchBar onSearch={mockSearch} debounceMs={300} />);
    
    const input = screen.getByRole("textbox");
    
    // Rapid typing
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });
    
    // Should not call immediately
    expect(mockSearch).not.toHaveBeenCalled();
    
    // Wait for debounce
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith("abc");
    }, { timeout: 400 });
  });
});
```

### Virtual Scrolling

**Large List Testing**:
```javascript
describe("Virtual List", () => {
  it("should render only visible items", () => {
    const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
    
    render(<VirtualList items={items} height={500} />);
    
    // Should not render all 10000 items
    const renderedItems = screen.getAllByText(/Item \d+/);
    expect(renderedItems.length).toBeLessThan(100);
    
    // First visible item should be rendered
    expect(screen.getByText("Item 0")).toBeInTheDocument();
  });

  it("should load more items on scroll", async () => {
    const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
    const { container } = render(<VirtualList items={items} />);
    
    const scrollContainer = container.querySelector('[role="list"]');
    
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } });
    
    await waitFor(() => {
      expect(screen.getByText("Item 500")).toBeInTheDocument();
    });
  });
});
```

### Performance Best Practices

1. **Measure Render Time**: Track component render performance
2. **Test With Realistic Data**: Use production-like dataset sizes
3. **Optimize Re-renders**: Test memoization and React.memo effectiveness
4. **Async Operations**: Test loading states and concurrent updates
5. **Virtualization**: Test virtual scrolling for large lists
6. **Code Splitting**: Verify lazy loading reduces initial bundle size
7. **Network Throttling**: Test performance on slow connections
8. **Animation Performance**: Ensure 60fps for animations (< 16ms per frame)

---

*Last Updated: October 2024*

---

## Giant Component Testing Patterns

### Overview

Giant components (1000+ lines) present unique testing challenges. This section provides strategies for testing large, complex components like AdminPanel, RemoteControl, and ReportConfigurator effectively.

### Key Principles

1. **Component Decomposition**: Break tests into logical sections matching component responsibilities
2. **Focused Test Suites**: Group related tests by feature/functionality
3. **Realistic Mocks**: Use production-like data and state
4. **Incremental Coverage**: Build coverage gradually, prioritizing critical paths
5. **Accessibility First**: Include accessibility checks in all test suites

### Testing Strategy for Giant Components

**Organize Tests by Feature Area**:
```javascript
describe("AdminPanel Component", () => {
  describe("Rendering", () => {
    // Basic rendering tests
  });
  
  describe("User Management Tab", () => {
    // User CRUD operations
  });
  
  describe("User Creation Modal", () => {
    // Modal interactions, validation
  });
  
  describe("Tab Navigation", () => {
    // Tab switching logic
  });
  
  describe("System Settings", () => {
    // Settings toggles and updates
  });
  
  describe("Accessibility", () => {
    // ARIA labels, keyboard navigation
  });
  
  describe("Error Handling", () => {
    // Error states and recovery
  });
});
```

### Multi-State Testing

**Test All Rendering States**:
```javascript
describe("RemoteControl Component", () => {
  it("should render in online state", () => {
    const unit = { id: "1", status: "online" };
    render(<RemoteControl unit={unit} />);
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });
  
  it("should render in offline state with warning", () => {
    const unit = { id: "1", status: "offline" };
    render(<RemoteControl unit={unit} />);
    expect(screen.getByText(/Connection Lost/i)).toBeInTheDocument();
  });
  
  it("should handle missing unit gracefully", () => {
    render(<RemoteControl unit={null} />);
    // Component should not crash
  });
});
```

### Context and Service Integration

**Mock Complex Dependencies**:
```javascript
// Mock authentication context
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", role: "admin" },
    userRole: "admin",
    permissions: { canManageUsers: true },
  }),
}));

// Mock API services
vi.mock("../services/usersAPI", () => ({
  getAllUsers: vi.fn(),
  deleteUser: vi.fn(),
  createUser: vi.fn(),
}));

// Mock settings context
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      soundEnabled: true,
      volume: 0.5,
    },
  }),
}));
```

### Interaction Testing for Complex Workflows

**Multi-Step User Flows**:
```javascript
describe("Report Configuration Workflow", () => {
  it("should complete full report generation flow", async () => {
    const mockOnGenerate = vi.fn();
    render(
      <ReportConfigurator
        dataProviders={mockData}
        onGenerate={mockOnGenerate}
      />
    );
    
    // Step 1: Select report type
    const energyReport = screen.getByLabelText("Energy Report");
    fireEvent.click(energyReport);
    
    // Step 2: Choose scope
    const singleUnitButton = screen.getByText(/Single Unit/i);
    fireEvent.click(singleUnitButton);
    
    // Step 3: Select unit
    const unit = screen.getByText("Unit 1");
    fireEvent.click(unit);
    
    // Step 4: Set date range
    const dateButton = screen.getByRole("button", { name: /pick a date/i });
    fireEvent.click(dateButton);
    
    // Step 5: Generate
    const generateButton = screen.getByText(/Generate Report/i);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          reportTypes: expect.arrayContaining(["energy"]),
          scope: "single",
        })
      );
    });
  });
});
```

### Error Boundary and Fallback Testing

**Test Error States**:
```javascript
describe("Error Handling", () => {
  it("should handle API failures gracefully", async () => {
    usersAPI.getAllUsers.mockRejectedValue(new Error("Network error"));
    
    render(<AdminPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });
  
  it("should show loading state during async operations", () => {
    usersAPI.getAllUsers.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    render(<AdminPanel />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Performance Testing for Giant Components

**Measure Render Performance**:
```javascript
// NOTE: This is pseudocode/example pattern for demonstration purposes.
// PerformanceTestHarness is a hypothetical utility - implement based on your needs.
import { PerformanceTestHarness } from "../tests/utils/testHelpers";

describe("Performance", () => {
  it("should render AdminPanel within acceptable time", async () => {
    const harness = new PerformanceTestHarness();
    
    const renderTime = await harness.measure(() => {
      render(<AdminPanel />);
    }, "AdminPanel initial render");
    
    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
  });
});
```

---

## Role-Based UI Testing Strategies

### Overview

Testing role-based access control and tenant filtering in the UI layer ensures proper security boundaries and user experience for different user types.

### Testing Different User Roles

**Admin vs Client/User Views**:
```javascript
// IMPORTANT: vi.mock() must be called at the module level, not inside test cases.
// Use variables to control the mock's behavior per test.

let mockUserRole = "admin";
let mockPermissions = { canViewAllUnits: true };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    userRole: mockUserRole,
    permissions: mockPermissions,
  }),
}));

describe("GridView - Role-Based Rendering", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    mockUserRole = "admin";
    mockPermissions = { canViewAllUnits: true };
  });

  it("should show 'Units Overview' for admin users", () => {
    render(<GridView />);
    expect(screen.getByText("Units Overview")).toBeInTheDocument();
  });
  
  it("should show 'My Units' for client users", () => {
    mockUserRole = "user";
    mockPermissions = { canViewAllUnits: false };
    
    render(<GridView />);
    expect(screen.getByText("My Units")).toBeInTheDocument();
  });
});
```

### Tenant Filtering Tests

**Verify Data Isolation**:
```javascript
describe("Tenant Filtering", () => {
  it("should show only user's assigned units", () => {
    const allUnits = [
      { id: "1", name: "Unit 1", tenantId: "tenant-a" },
      { id: "2", name: "Unit 2", tenantId: "tenant-b" },
      { id: "3", name: "Unit 3", tenantId: "tenant-a" },
    ];
    
    vi.mock("../context/TenantContext", () => ({
      useTenant: () => ({
        currentTenant: { id: "tenant-a" },
      }),
    }));
    
    vi.mock("../context/UnitContext", () => ({
      useUnits: () => ({
        units: allUnits.filter(u => u.tenantId === "tenant-a"),
      }),
    }));
    
    render(<GridView />);
    
    // Should see tenant-a units only
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.queryByText("Unit 2")).not.toBeInTheDocument();
  });
  
  it("should prevent cross-tenant data access", () => {
    // Use a test wrapper to provide a changeable tenant context
    function TestTenantProvider({ tenantId, children }) {
      const value = { currentTenant: { id: tenantId } };
      const allUnits = [
        { id: "1", name: "Unit 1", tenantId: "tenant-a" },
        { id: "2", name: "Unit 2", tenantId: "tenant-b" },
        { id: "3", name: "Unit 3", tenantId: "tenant-a" },
      ];
      const units = allUnits.filter(u => u.tenantId === tenantId);
      
      return (
        <TenantContext.Provider value={value}>
          <UnitContext.Provider value={{ units }}>
            {children}
          </UnitContext.Provider>
        </TenantContext.Provider>
      );
    }

    // Initial render with tenant-a
    const { rerender } = render(
      <TestTenantProvider tenantId="tenant-a">
        <GridView />
      </TestTenantProvider>
    );
    
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.queryByText("Unit 2")).not.toBeInTheDocument();
    
    // Rerender with tenant-b
    rerender(
      <TestTenantProvider tenantId="tenant-b">
        <GridView />
      </TestTenantProvider>
    );
    
    // Only tenant-b's units should be visible
    expect(screen.getByText("Unit 2")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Unit 3")).not.toBeInTheDocument();
  });
});
```

### Navigation and Routing Tests

**Role-Based Route Access**:
```javascript
// Module-level mock setup
let mockUserRole = "admin";
let mockPermissions = { canViewAnalytics: true };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    userRole: mockUserRole,
    permissions: mockPermissions,
  }),
}));

describe("SideNavigation - Role-Based Menu Items", () => {
  beforeEach(() => {
    // Reset to defaults
    mockUserRole = "admin";
    mockPermissions = { canViewAnalytics: true };
  });

  it("should show admin-only items for admin users", () => {
    render(
      <BrowserRouter>
        <SideNavigation />
      </BrowserRouter>
    );
    
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });
  
  it("should hide admin items for client users", () => {
    mockUserRole = "user";
    mockPermissions = { canViewAnalytics: false };
    
    render(
      <BrowserRouter>
        <SideNavigation />
      </BrowserRouter>
    );
    
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Sales")).not.toBeInTheDocument();
  });
  
  it("should show contextual labels based on role", () => {
    mockUserRole = "user";
    mockPermissions = {};
    
    render(
      <BrowserRouter>
        <SideNavigation />
      </BrowserRouter>
    );
    
    // Clients see "My Units" instead of "Units Overview"
    expect(screen.getByText("My Units")).toBeInTheDocument();
  });
});
```

### Permission-Based Feature Tests

**Conditional Feature Availability**:
```javascript
// Mock the AuthContext with different roles
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";

describe("Permission-Based Features", () => {
  const mockUnit = {
    id: "unit-123",
    name: "Test Unit",
    status: "online",
    watergeneration: true,
  };

  it("should enable remote control for Admin role", () => {
    useAuth.mockReturnValue({
      backendRole: "admin",
      user: { username: "admin" },
    });
    
    render(<RemoteControl unit={mockUnit} />);
    
    const switches = screen.getAllByRole("switch");
    // Admin should have all controls enabled
    expect(switches[0]).not.toBeDisabled(); // Machine power
    expect(switches[1]).not.toBeDisabled(); // Water production
    expect(switches[2]).not.toBeDisabled(); // Auto switch
  });

  it("should enable remote control for Operator role", () => {
    useAuth.mockReturnValue({
      backendRole: "operator",
      user: { username: "operator" },
    });
    
    render(<RemoteControl unit={mockUnit} />);
    
    const switches = screen.getAllByRole("switch");
    // Operator should have all controls enabled
    expect(switches[0]).not.toBeDisabled();
    expect(switches[1]).not.toBeDisabled();
    expect(switches[2]).not.toBeDisabled();
  });
  
  it("should disable remote control for Viewer role (Security)", () => {
    useAuth.mockReturnValue({
      backendRole: "viewer",
      user: { username: "viewer" },
    });
    
    render(<RemoteControl unit={mockUnit} />);
    
    const switches = screen.getAllByRole("switch");
    // Viewer should have all controls disabled
    expect(switches[0]).toBeDisabled(); // Machine power
    expect(switches[1]).toBeDisabled(); // Water production
    expect(switches[2]).toBeDisabled(); // Auto switch
  });
});
```

### Multi-Tenant Scenario Testing

**Cross-Tenant Validation**:
```javascript
describe("Multi-Tenant Scenarios", () => {
  it("should maintain data isolation across tenant switches", async () => {
    const tenantAData = [
      { id: "1", name: "Tenant A Unit 1" },
    ];
    const tenantBData = [
      { id: "2", name: "Tenant B Unit 1" },
    ];
    
    let currentTenant = "tenant-a";
    
    vi.mock("../context/TenantContext", () => ({
      useTenant: () => ({
        currentTenant: { id: currentTenant },
      }),
    }));
    
    const { rerender } = render(<GridView />);
    
    expect(screen.getByText("Tenant A Unit 1")).toBeInTheDocument();
    
    // Switch tenant
    currentTenant = "tenant-b";
    rerender(<GridView />);
    
    await waitFor(() => {
      expect(screen.queryByText("Tenant A Unit 1")).not.toBeInTheDocument();
      expect(screen.getByText("Tenant B Unit 1")).toBeInTheDocument();
    });
  });
});
```

### Best Practices for Role-Based Testing

1. **Test All Roles**: Verify behavior for each user role (admin, user, viewer, etc.)
2. **Permission Combinations**: Test various permission combinations
3. **Tenant Isolation**: Ensure strict data boundaries between tenants
4. **Dynamic Labels**: Verify UI text changes based on user context
5. **Access Control**: Test that restricted features are properly hidden/disabled
6. **Navigation Guards**: Verify role-based route protection
7. **Audit Trail**: Test that user actions are properly logged with role context

### Example: Complete Role-Based Test Suite

```javascript
describe("GridView - Complete Role-Based Test Suite", () => {
  const setupTest = (role, permissions = {}) => {
    vi.mock("../context/AuthContext", () => ({
      useAuth: () => ({
        userRole: role,
        permissions: {
          canViewAllUnits: role === "admin",
          ...permissions,
        },
      }),
    }));
  };
  
  describe("Admin Role", () => {
    beforeEach(() => setupTest("admin"));
    
    it("shows full unit list", () => {
      render(<GridView />);
      // Verify admin sees all units
    });
    
    it("displays 'Units Overview' title", () => {
      render(<GridView />);
      expect(screen.getByText(/Units Overview/i)).toBeInTheDocument();
    });
    
    it("has access to admin actions", () => {
      render(<GridView />);
      // Verify admin-only buttons/features
    });
  });
  
  describe("Client/User Role", () => {
    beforeEach(() => setupTest("user"));
    
    it("shows filtered unit list", () => {
      render(<GridView />);
      // Verify user sees only assigned units
    });
    
    it("displays 'My Units' title", () => {
      render(<GridView />);
      expect(screen.getByText(/My Units/i)).toBeInTheDocument();
    });
    
    it("hides admin actions", () => {
      render(<GridView />);
      // Verify admin features are hidden
    });
  });
  
  describe("Viewer Role", () => {
    beforeEach(() => setupTest("viewer", { canEdit: false }));
    
    it("shows read-only interface", () => {
      render(<GridView />);
      // Verify no edit/delete buttons
    });
  });
});
```

---

*Last Updated: October 2024 - Added Giant Component Testing and Role-Based UI Testing Sections*

---

## Medium Component Acceleration Strategies

### Overview

Medium-sized components (200-500 lines) represent the "sweet spot" for test coverage acceleration. They provide significant coverage gains with manageable testing complexity, making them ideal targets for Phase 2.6 coverage optimization.

### Identifying Medium Components

**Discovery Commands:**
```bash
# Find medium-sized components (200-500 lines)
for file in $(find src/components -name "*.jsx" -type f); do
  lines=$(wc -l < "$file")
  if [ "$lines" -ge 200 ] && [ "$lines" -le 500 ]; then
    echo "$lines $file"
  fi
done | sort -rn

# Check for existing tests
for comp in "SideNavigation" "AlertsView" "NotificationBell"; do
  echo -n "$comp: "
  find src/tests -name "*${comp}*" | wc -l
done
```

### Testing Strategies for Medium Components

**1. Navigation Components (SideNavigation, MobileNavigation)**

Focus areas:
- Role-based menu rendering
- Active route highlighting
- Mobile/desktop responsive behavior
- Permission-based visibility

```javascript
describe("SideNavigation", () => {
  it("should show admin-only items for admin users", () => {
    const { useAuth } = await import("../context/AuthContext");
    useAuth.mockReturnValue({
      userRole: "admin",
      permissions: { canViewAnalytics: true },
    });

    render(<BrowserRouter><SideNavigation /></BrowserRouter>);
    
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("should hide admin items for regular users", () => {
    const { useAuth } = await import("../context/AuthContext");
    useAuth.mockReturnValue({
      userRole: "user",
      permissions: {},
    });

    render(<BrowserRouter><SideNavigation /></BrowserRouter>);
    
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Sales")).not.toBeInTheDocument();
  });
});
```

**2. Alert/Notification Components (AlertsView, NotificationBell)**

Focus areas:
- Alert filtering (critical, warning, info, success)
- Real-time notification updates
- Badge counts
- Click interactions and navigation

```javascript
describe("AlertsView", () => {
  it("should filter critical alerts", () => {
    render(<BrowserRouter><AlertsView /></BrowserRouter>);

    const filterButton = screen.getByRole("combobox");
    fireEvent.change(filterButton, { target: { value: "critical" } });

    expect(screen.getByText("Unit Offline")).toBeInTheDocument();
    expect(screen.queryByText("Maintenance Scheduled")).not.toBeInTheDocument();
  });

  it("should navigate to unit details on alert click", () => {
    const mockNavigate = vi.fn();
    vi.mock("react-router-dom", () => ({
      useNavigate: () => mockNavigate,
    }));

    render(<BrowserRouter><AlertsView /></BrowserRouter>);
    
    const alertCard = screen.getByText("Unit Offline").closest("div");
    fireEvent.click(alertCard);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/unit-details/"),
      expect.any(Object)
    );
  });
});
```

**3. Dashboard/Analytics Components (ViewAnalytics, SystemHealth)**

Focus areas:
- Data rendering and formatting
- Chart/visualization mocking
- Metric calculations
- Refresh intervals

```javascript
describe("ViewAnalytics", () => {
  beforeEach(() => {
    // Mock chart libraries
    vi.mock("recharts", () => ({
      ResponsiveContainer: ({ children }) => <div>{children}</div>,
      BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
      // ... other chart components
    }));
  });

  it("should render analytics metrics", () => {
    render(<ViewAnalytics />);
    
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
```

### Utility Function Testing Patterns

**1. Notification Utilities**

```javascript
describe("notifications utility", () => {
  it("should filter notifications by role", () => {
    const adminNotifications = getAllNotifications("admin");
    const userNotifications = getAllNotifications("user");

    expect(adminNotifications.length).toBeGreaterThanOrEqual(
      userNotifications.length
    );
  });

  it("should extract unit-specific notifications", () => {
    const notifications = getAllCurrentNotificationsForUnit("001", "admin");
    
    notifications.forEach(n => {
      expect(n).toBeDefined();
    });
  });
});
```

**2. Mock Data Utilities**

```javascript
describe("mockDataUtils", () => {
  it("should generate chronological timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));

    const timestamps = [];
    for (let i = 0; i < 5; i++) {
      timestamps.push(generateTimestamp(i * 1000));
    }

    // Verify timestamps are in correct order
    for (let i = 1; i < timestamps.length; i++) {
      expect(new Date(timestamps[i])).toBeLessThan(new Date(timestamps[i-1]));
    }

    vi.useRealTimers();
  });
});
```

### Batch Testing Techniques

**1. Parameterized Role Testing**

```javascript
describe.each([
  ['admin', ['Admin Panel', 'Sales', 'System Health']],
  ['user', ['My Units', 'Alerts', 'Reports']],
  ['viewer', ['Dashboard', 'Reports']],
])('Navigation for %s role', (role, expectedItems) => {
  it('should show correct menu items', () => {
    mockAuth({ userRole: role });
    render(<SideNavigation />);

    expectedItems.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });
});
```

**2. Filter Combinations**

```javascript
const filterCombinations = [
  { filter: 'critical', expected: ['Unit Offline', 'Pressure Drop'] },
  { filter: 'warning', expected: ['Low Water Level', 'Temperature Alert'] },
  { filter: 'info', expected: ['Maintenance Scheduled'] },
  { filter: 'success', expected: ['System Restored'] },
];

filterCombinations.forEach(({ filter, expected }) => {
  it(`should filter ${filter} alerts`, () => {
    render(<AlertsView />);
    
    fireEvent.change(screen.getByRole("combobox"), { 
      target: { value: filter } 
    });

    expected.forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });
});
```

### Coverage Optimization for High-ROI Components

**Target Selection Criteria:**

1. **High Impact** (0% → 80%+ coverage gain)
   - NotificationBell: 367 lines, 0% coverage
   - DeviceStatusDashboard: 353 lines, 0% coverage
   - PasswordResetRequest: 218 lines, 0% coverage

2. **Medium Impact** (50% → 80%+ coverage gain)
   - AdminPanel: 76.2% → target 85%
   - AlertsView: 94.58% → target 98%

3. **Already High Coverage** (maintain)
   - GridView: 98.93%
   - HistoryView: 99.16%
   - Dashboard: 99.08%

**Prioritization Formula:**

```
Impact Score = (Lines × (100 - Current Coverage)) / Test Complexity
```

Where Test Complexity (1-5):
- 1 = Simple presentational component
- 3 = Component with state/context
- 5 = Complex with external services

**Example Calculations:**

```
NotificationBell: (367 × 100) / 3 = 12,233 points
DeviceStatusDashboard: (353 × 100) / 4 = 8,825 points
PasswordResetRequest: (218 × 100) / 2 = 10,900 points
```

**Testing Workflow:**

1. **Baseline**: Run `pnpm test:coverage` to establish current state
2. **Identify**: Use discovery commands to find untested components
3. **Prioritize**: Calculate impact scores
4. **Test**: Create focused test suites (aim for 80%+ component coverage)
5. **Verify**: Re-run coverage to confirm gains
6. **Iterate**: Move to next component

**Coverage Acceleration Tips:**

- **Mock Context Providers** at module level for consistent behavior
- **Use data-testid** sparingly, prefer semantic queries
- **Test user flows** over implementation details
- **Batch similar tests** using describe.each
- **Focus on happy path** first, then edge cases
- **Avoid testing third-party libs** (e.g., don't test Recharts internals)

### Phase 2.6 Results Template

```markdown
## Phase 2.6: Medium Component Acceleration Results

**Coverage Achieved:**
- Before: 40.73%
- After: 50.12%
- Gain: +9.39%

**Components Tested:**
1. SideNavigation (405 lines): 0% → 92% (+92%)
2. AlertsView (329 lines): 0% → 95% (+95%)
3. NotificationBell (367 lines): 0% → 85% (+85%)
4. ... (continue for all tested components)

**Utilities Tested:**
1. notifications.js: 0% → 100% (+100%)
2. mockDataUtils.js: 0% → 100% (+100%)

**Total Tests Added:** 250+
**Execution Time:** ~8 seconds
**All Workflows:** ✅ Passing
```

---

*Last Update: October 2025 - Added Medium Component Acceleration Strategies Section*


import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RemoteControl from '../components/RemoteControl';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';

// Mock the hooks
vi.mock('../hooks/useRemoteControl', () => ({
  useRemoteControl: () => ({
    permissions: {
      has_remote_control: true,
      role: 'admin',
      permissions: {
        read_units: true,
        write_units: true,
        remote_control: true
      }
    },
    isLoading: false,
    error: null,
    controlPower: vi.fn().mockResolvedValue({ success: true }),
    controlWaterProduction: vi.fn().mockResolvedValue({ success: true })
  })
}));

// Mock audio player
vi.mock('../utils/audioPlayer', () => ({
  default: vi.fn()
}));

const mockUnit = {
  id: 'TC001',
  name: 'Test Unit',
  location: 'Test Location',
  status: 'online',
  watergeneration: true,
  waterProductionOn: false
};

const renderWithProviders = (component, options = {}) => {
  const { user = { username: 'admin', role: 'admin' }, ...renderOptions } = options;
  
  // Mock localStorage for authentication
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key) => {
        if (key === 'thermacore_user') return JSON.stringify(user);
        if (key === 'thermacore_role') return user.role;
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });

  return render(
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          {component}
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>,
    renderOptions
  );
};

describe('RemoteControl Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders remote control interface for authorized users', async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Remote Control - Test Unit')).toBeInTheDocument();
      expect(screen.getByText('Admin • Remote Control')).toBeInTheDocument();
    });
  });

  test('shows access denied for users without remote control permissions', async () => {
    // Mock localStorage for viewer user
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => {
          if (key === 'thermacore_user') return JSON.stringify({ username: 'viewer', role: 'viewer' });
          if (key === 'thermacore_role') return 'viewer';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // Create a mock for viewer permissions
    vi.doMock('../hooks/useRemoteControl', async (importOriginal) => {
      return {
        useRemoteControl: () => ({
          permissions: {
            has_remote_control: false,
            role: 'viewer',
            permissions: {
              read_units: true,
              write_units: false,
              remote_control: false
            }
          },
          isLoading: false,
          error: null,
          controlPower: vi.fn(),
          controlWaterProduction: vi.fn()
        })
      };
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <RemoteControl unit={mockUnit} />
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Your role \(viewer\) does not have remote control permissions/)).toBeInTheDocument();
    });
  });

  test('shows authentication required for unauthenticated users', () => {
    // Mock unauthenticated state
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    renderWithProviders(<RemoteControl unit={mockUnit} />);

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Please log in to access remote control features.')).toBeInTheDocument();
  });

  test('shows unit not found when no unit provided', () => {
    renderWithProviders(<RemoteControl />);

    expect(screen.getByText('Unit Not Found')).toBeInTheDocument();
  });

  test('displays control switches with proper disabled states', async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      // Test that the control interfaces are displayed
      expect(screen.getByText('Machine Power Control')).toBeInTheDocument();
      expect(screen.getByText('Water Production')).toBeInTheDocument();
      expect(screen.getByText('Auto Switch On (Water Level < 75%)')).toBeInTheDocument();
    });
  });

  test('handles machine power control', async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Remote Control - Test Unit')).toBeInTheDocument();
      expect(screen.getByText('Machine Power Control')).toBeInTheDocument();
    });

    // Test that the control interface is available
    expect(screen.getByText('Turn the entire machine on or off')).toBeInTheDocument();
  });

  test('handles water production control', async () => {
    const onlineUnit = { ...mockUnit, status: 'online' };
    renderWithProviders(<RemoteControl unit={onlineUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Water Production')).toBeInTheDocument();
    });

    // Test that water production control is available
    expect(screen.getByText('Enable or disable water production')).toBeInTheDocument();
  });

  test('shows permission indicator correctly', async () => {
    renderWithProviders(<RemoteControl unit={mockUnit} />);

    await waitFor(() => {
      expect(screen.getByText('Admin • Remote Control')).toBeInTheDocument();
    });
  });
});
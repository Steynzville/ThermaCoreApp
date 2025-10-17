import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import AdminPanel from '../components/AdminPanel';
import * as AuthContext from '../context/AuthContext.jsx';
import * as apiFetch from '../utils/apiFetch';
import * as usersAPI from '../services/usersAPI';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUser = {
  id: 1,
  username: 'admin',
  role: 'admin',
  email: 'admin@thermacore.com',
  firstName: 'Admin',
  lastName: 'User',
};

const mockUsers = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john@thermacore.com',
    first_name: 'John',
    last_name: 'Doe',
    role: { name: 'admin' },
    is_active: true,
  },
];

const mockRoles = [
  { id: 1, name: 'admin', description: 'Administrator' },
  { id: 2, name: 'operator', description: 'Operator' },
  { id: 3, name: 'viewer', description: 'Viewer' },
];

const renderWithProviders = (component) => {
  // Mock AuthContext
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: mockUser,
    userRole: 'admin',
    isAuthenticated: true,
    isLoading: false,
  });

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key) => {
        if (key === 'thermacore_user') return JSON.stringify(mockUser);
        if (key === 'thermacore_role') return 'admin';
        if (key === 'thermacore_token') return 'fake-token';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });

  // Mock usersAPI
  vi.spyOn(usersAPI, 'getAllUsers').mockResolvedValue({
    data: mockUsers,
    page: 1,
    per_page: 100,
    total: mockUsers.length,
  });

  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminPanel User Creation Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show all three role options (admin, operator, viewer) in the dropdown when roles are fetched successfully', async () => {
    // Mock successful roles API call
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRoles,
    });

    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Find all select elements (role dropdown will be one of them)
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects[0]; // Should be the only select in the modal
    expect(roleSelect).toBeInTheDocument();
    
    // Check that all three roles are available as options
    const options = roleSelect.querySelectorAll('option');
    
    // First option should be placeholder
    expect(options[0]).toHaveTextContent('Select a role');
    
    // Check for all three roles
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Operator');
    expect(options[3]).toHaveTextContent('Viewer');
    expect(options.length).toBe(4); // placeholder + 3 roles
  });

  it('should show all three role options using fallback when roles API fails', async () => {
    // Mock failed roles API call
    vi.spyOn(apiFetch, 'apiGet').mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Find the role dropdown
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects[0];
    expect(roleSelect).toBeInTheDocument();
    
    // Check that all three roles are available as options (from fallback)
    const options = roleSelect.querySelectorAll('option');
    
    expect(options[0]).toHaveTextContent('Select a role');
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Operator');
    expect(options[3]).toHaveTextContent('Viewer');
    expect(options.length).toBe(4);
  });

  it('should show all three role options when API returns non-ok response', async () => {
    // Mock API returning non-ok response (e.g., 401, 403)
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Find the role dropdown
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects[0];
    
    // Check that all three roles are available as options (from fallback)
    const options = roleSelect.querySelectorAll('option');
    
    expect(options[0]).toHaveTextContent('Select a role');
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Operator');
    expect(options[3]).toHaveTextContent('Viewer');
    expect(options.length).toBe(4);
  });

  it('should show all three role options when API returns empty array', async () => {
    // Mock API returning empty array
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Find the role dropdown
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects[0];
    
    // Check that all three roles are available as options (from fallback)
    const options = roleSelect.querySelectorAll('option');
    
    expect(options[0]).toHaveTextContent('Select a role');
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Operator');
    expect(options[3]).toHaveTextContent('Viewer');
    expect(options.length).toBe(4);
  });

  it('should allow selecting operator role', async () => {
    // Mock successful roles API call
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRoles,
    });

    renderWithProviders(<AdminPanel />);
    
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Select operator role
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects[0];
    fireEvent.change(roleSelect, { target: { value: '2' } });
    
    // Verify the selection
    expect(roleSelect.value).toBe('2');
  });

  it('should allow selecting viewer role', async () => {
    // Mock successful roles API call
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRoles,
    });

    renderWithProviders(<AdminPanel />);
    
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Select viewer role
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects[0];
    fireEvent.change(roleSelect, { target: { value: '3' } });
    
    // Verify the selection
    expect(roleSelect.value).toBe('3');
  });
});

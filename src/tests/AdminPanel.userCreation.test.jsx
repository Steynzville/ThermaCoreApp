import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';

import * as AuthContext from '../context/AuthContext.jsx';
import * as usersAPI from '../services/usersAPI';
import * as apiFetch from '../utils/apiFetch';

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

describe('AdminPanel User Creation Form', () => {
  let originalLocalStorage;
  let authSpy;
  let usersAPISpy;

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = window.localStorage;

    // Mock localStorage with proper spies
    const localStorageMock = {
      getItem: vi.fn((key) => {
        if (key === 'thermacore_user') return JSON.stringify(mockUser);
        if (key === 'thermacore_role') return 'admin';
        if (key === 'thermacore_token') return 'fake-token';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock AuthContext
    authSpy = vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      userRole: 'admin',
      isAuthenticated: true,
      isLoading: false,
    });

    // Mock usersAPI
    usersAPISpy = vi.spyOn(usersAPI, 'getAllUsers').mockResolvedValue({
      data: mockUsers,
      page: 1,
      per_page: 100,
      total: mockUsers.length,
    });
  });

  afterEach(() => {
    // Restore all mocks
    vi.restoreAllMocks();
    
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );
  };

  it('should show all three role options (admin, operator, viewer) in the dropdown when roles are fetched successfully', async () => {
    // Mock successful roles API call
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRoles,
    });

    renderComponent();
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    // Wait for modal to appear
    const modal = await screen.findByText('Create New User');
    expect(modal).toBeInTheDocument();
    
    // Wait for roles to load - find the Role label and get the associated select
    const roleSelect = await screen.findByLabelText(/Role/i);
    
    // Wait for roles to populate
    await waitFor(() => {
      const options = within(roleSelect).getAllByRole('option');
      expect(options[0]).toHaveTextContent('Select a role');
    });
    
    // Check that all three roles are available as options
    const options = within(roleSelect).getAllByRole('option');
    
    // First option should be placeholder
    expect(options[0]).toHaveTextContent('Select a role');
    
    // Check for all three roles
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Operator');
    expect(options[3]).toHaveTextContent('Viewer');
    expect(options.length).toBe(4); // placeholder + 3 roles
  });

  it('should show error message when roles API fails', async () => {
    // Mock failed roles API call
    vi.spyOn(apiFetch, 'apiGet').mockRejectedValueOnce(new Error('Network error'));

    renderComponent();
    
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
    
    // Check that error message is displayed instead of dropdown
    await waitFor(() => {
      expect(screen.getByText('Unable to load roles. Please refresh the page.')).toBeInTheDocument();
    });
    
    // Verify Create button is disabled
    const createButton = screen.getByRole('button', { name: /Create User/i });
    expect(createButton).toBeDisabled();
  });

  it('should show error message when API returns non-ok response', async () => {
    // Mock API returning non-ok response (e.g., 401, 403)
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    renderComponent();
    
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
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Unable to load roles. Please refresh the page.')).toBeInTheDocument();
    });
  });

  it('should show error message when API returns empty array', async () => {
    // Mock API returning empty array
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderComponent();
    
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
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Unable to load roles. Please refresh the page.')).toBeInTheDocument();
    });
  });

  it('should allow selecting operator role', async () => {
    // Mock successful roles API call
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRoles,
    });

    renderComponent();
    
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Select operator role using label
    const roleSelect = await screen.findByLabelText(/Role/i);
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

    renderComponent();
    
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
    
    // Select viewer role using label
    const roleSelect = await screen.findByLabelText(/Role/i);
    fireEvent.change(roleSelect, { target: { value: '3' } });
    
    // Verify the selection
    expect(roleSelect.value).toBe('3');
  });

  it('should handle roles wrapped in {roles: [...]} format', async () => {
    // Mock API returning roles in {roles: [...]} format
    vi.spyOn(apiFetch, 'apiGet').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ roles: mockRoles }),
    });

    renderComponent();
    
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Click Add User button
    const addUserButton = screen.getByText('Add User');
    fireEvent.click(addUserButton);
    
    const modal = await screen.findByText('Create New User');
    expect(modal).toBeInTheDocument();
    
    // Find role select using label
    const roleSelect = await screen.findByLabelText(/Role/i);
    
    // Wait for roles to load
    await waitFor(() => {
      const options = within(roleSelect).getAllByRole('option');
      expect(options[0]).toHaveTextContent('Select a role');
    });
    
    // Check that all three roles are available
    const options = within(roleSelect).getAllByRole('option');
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Operator');
    expect(options[3]).toHaveTextContent('Viewer');
    expect(options.length).toBe(4);
  });
});

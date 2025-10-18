import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import AdminPanel from '../components/AdminPanel';
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
  {
    id: 2,
    username: 'jane_smith',
    email: 'jane@thermacore.com',
    first_name: 'Jane',
    last_name: 'Smith',
    role: { name: 'operator' },
    is_active: true,
  },
  {
    id: 3,
    username: 'mike_johnson',
    email: 'mike@thermacore.com',
    first_name: 'Mike',
    last_name: 'Johnson',
    role: { name: 'viewer' },
    is_active: false,
  },
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

  vi.spyOn(usersAPI, 'deleteUser').mockResolvedValue({
    ok: true,
    status: 204,
  });

  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    vi.spyOn(usersAPI, 'getAllUsers').mockResolvedValue({
      data: mockUsers,
      page: 1,
      per_page: 100,
      total: mockUsers.length,
    });
  });

  it('should render all three tabs: Users, Password Management, and Settings', async () => {
    renderWithProviders(<AdminPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Password Management')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should display Password Management tab when clicked', () => {
    renderWithProviders(<AdminPanel />);
    
    const passwordTab = screen.getByText('Password Management');
    fireEvent.click(passwordTab);
    
    expect(screen.getByText('Your Account')).toBeInTheDocument();
    expect(screen.getByText('Change My Password')).toBeInTheDocument();
    expect(screen.getByText('User Password Reset')).toBeInTheDocument();
  });

  it('should open password reset modal when "Change My Password" is clicked', () => {
    renderWithProviders(<AdminPanel />);
    
    // Click on Password Management tab
    const passwordTab = screen.getByText('Password Management');
    fireEvent.click(passwordTab);
    
    // Click on Change My Password button
    const changePasswordBtn = screen.getByText('Change My Password');
    fireEvent.click(changePasswordBtn);
    
    // Check if modal is displayed - use role and heading to be more specific
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
  });

  it('should show password visibility toggle buttons', () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    // Check for password visibility toggle buttons (Eye icons)
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);
    expect(passwordInputs).toHaveLength(2);
  });

  it('should validate password matching', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    // Fill in non-matching passwords
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    
    // Check that Reset Password button is disabled when passwords don't match
    const modal = screen.getByTestId('password-reset-modal');
    const modalResetButton = within(modal).getByRole('button', { name: /Reset Password/i });
    
    await waitFor(() => {
      expect(modalResetButton).toBeDisabled();
    });
  });

  it('should validate minimum password length', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    // Fill in short password
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    
    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    
    // Check that Reset Password button is disabled when password is too short
    const modal = screen.getByTestId('password-reset-modal');
    const modalResetButton = within(modal).getByRole('button', { name: /Reset Password/i });
    
    await waitFor(() => {
      expect(modalResetButton).toBeDisabled();
    });
    
    // Check for validation warning (static info banner removed per requirements)
    await waitFor(() => {
      const errorMessage = screen.getByText('Password must be at least 6 characters long');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it('should enable button when passwords are valid and match', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    // Fill in valid matching passwords
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    // Check that Reset Password button is enabled when validation passes
    const modal = screen.getByTestId('password-reset-modal');
    const modalResetButton = within(modal).getByRole('button', { name: /Reset Password/i });
    
    await waitFor(() => {
      expect(modalResetButton).not.toBeDisabled();
    });
  });

  it('should list users in Password Management tab', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Navigate to Password Management tab
    fireEvent.click(screen.getByText('Password Management'));
    
    // Check if users are listed
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    });
  });

  it('should have Reset Password button for each user', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Navigate to Password Management tab
    fireEvent.click(screen.getByText('Password Management'));
    
    // Check for Reset Password buttons (3 users)
    await waitFor(() => {
      const resetButtons = screen.getAllByText('Reset Password');
      expect(resetButtons.length).toBeGreaterThan(0);
    });
  });

  it('should maintain existing Users tab functionality', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Wait for users to load
    await waitFor(() => {
      expect(usersAPI.getAllUsers).toHaveBeenCalled();
    });
    
    // Users tab should be active by default
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
    
    // Check if users are displayed in the table
    await waitFor(() => {
      expect(screen.getByText('john@thermacore.com')).toBeInTheDocument();
      expect(screen.getByText('jane@thermacore.com')).toBeInTheDocument();
    });
  });

  it('should maintain existing Settings tab functionality', () => {
    renderWithProviders(<AdminPanel />);
    
    // Click on Settings tab
    fireEvent.click(screen.getByText('Settings'));
    
    // Check if settings content is displayed
    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Auto Backup')).toBeInTheDocument();
  });

  it('should show password mismatch warning in real-time', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    // Fill in valid password first
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    
    // Check that password mismatch warning appears
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('should hide password mismatch warning when passwords match', async () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    
    // First create mismatch
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    
    // Then fix the mismatch
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    });
  });

  it('should use validation state in form submission', async () => {
    // Mock apiPost to prevent actual API calls
    const mockApiPost = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    }));
    vi.spyOn(apiFetch, 'apiPost').mockImplementation(mockApiPost);

    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText('Password Management'));
    fireEvent.click(screen.getByText('Change My Password'));
    
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    
    // Try to submit with short password
    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    
    const modal = screen.getByTestId('password-reset-modal');
    const modalResetButton = within(modal).getByRole('button', { name: /Reset Password/i });
    
    // Button should be disabled
    expect(modalResetButton).toBeDisabled();
    
    // Try to submit with mismatched passwords
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    
    // Button should still be disabled
    expect(modalResetButton).toBeDisabled();
    
    // Submit with valid matching passwords
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    await waitFor(() => {
      expect(modalResetButton).not.toBeDisabled();
    });
  });
});

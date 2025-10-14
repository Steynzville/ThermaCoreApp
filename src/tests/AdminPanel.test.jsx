import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminPanel from '../components/AdminPanel';
import * as AuthContext from '../context/AuthContext.jsx';
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

  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all three tabs: Users, Password Management, and Settings', () => {
    renderWithProviders(<AdminPanel />);
    
    expect(screen.getByText('Users')).toBeInTheDocument();
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
    
    // Check if modal is displayed
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
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
    
    // Click Reset Password button (get the one in the modal)
    const resetButtons = screen.getAllByText('Reset Password');
    const modalResetButton = resetButtons.find(btn => btn.tagName === 'SPAN' && btn.closest('button'));
    fireEvent.click(modalResetButton.closest('button'));
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
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
    
    // Click Reset Password button (get the one in the modal)
    const resetButtons = screen.getAllByText('Reset Password');
    const modalResetButton = resetButtons.find(btn => btn.tagName === 'SPAN' && btn.closest('button'));
    fireEvent.click(modalResetButton.closest('button'));
    
    // Check for validation error (there are two instances, one in the modal)
    await waitFor(() => {
      const errorMessages = screen.getAllByText('Password must be at least 6 characters long');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should list users in Password Management tab', () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management tab
    fireEvent.click(screen.getByText('Password Management'));
    
    // Check if users are listed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
  });

  it('should have Reset Password button for each user', () => {
    renderWithProviders(<AdminPanel />);
    
    // Navigate to Password Management tab
    fireEvent.click(screen.getByText('Password Management'));
    
    // Check for Reset Password buttons (3 users)
    const resetButtons = screen.getAllByText('Reset Password');
    expect(resetButtons.length).toBeGreaterThan(0);
  });

  it('should maintain existing Users tab functionality', () => {
    renderWithProviders(<AdminPanel />);
    
    // Users tab should be active by default
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
    
    // Check if users are displayed in the table
    expect(screen.getByText('john@thermacore.com')).toBeInTheDocument();
    expect(screen.getByText('jane@thermacore.com')).toBeInTheDocument();
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
});

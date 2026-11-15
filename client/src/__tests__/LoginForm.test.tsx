import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { LoginPage } from '../pages/LoginPage.js';
import * as AuthContextModule from '../context/AuthContext.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage & Login Form Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements and passes WCAG accessibility', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: null,
      circle: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Enter Your Care Circle/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Circle Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Role Passcode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter Circle/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('submits credentials and redirects elder role to /today', async () => {
    const loginMock = vi.fn().mockResolvedValue({
      circleId: 'circle-1',
      role: 'elder',
      displayName: 'Eleanor',
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: null,
      circle: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: loginMock,
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Circle Code/i), {
      target: { value: 'CARE-1234' },
    });
    fireEvent.change(screen.getByLabelText(/Role Passcode/i), {
      target: { value: 'elder123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Enter Circle/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        circleCode: 'CARE-1234',
        passcode: 'elder123',
        displayName: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith('/today');
    });
  });

  it('submits credentials and redirects caretaker or family role to /dashboard', async () => {
    const loginMock = vi.fn().mockResolvedValue({
      circleId: 'circle-1',
      role: 'caretaker',
      displayName: 'Nurse Adams',
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: null,
      circle: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: loginMock,
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Circle Code/i), {
      target: { value: 'CARE-1234' },
    });
    fireEvent.change(screen.getByLabelText(/Role Passcode/i), {
      target: { value: 'care123' },
    });
    fireEvent.change(screen.getByLabelText(/Your Display Name/i), {
      target: { value: 'Nurse Adams' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Enter Circle/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        circleCode: 'CARE-1234',
        passcode: 'care123',
        displayName: 'Nurse Adams',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays accessible error message when login fails', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('Invalid circle code or passcode'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: null,
      circle: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: loginMock,
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Circle Code/i), {
      target: { value: 'WRONG' },
    });
    fireEvent.change(screen.getByLabelText(/Role Passcode/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Enter Circle/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Invalid circle code or passcode/i);
    });
  });
});

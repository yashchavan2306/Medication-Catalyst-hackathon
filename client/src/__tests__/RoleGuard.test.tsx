import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { RoleGuard } from '../components/RoleGuard.js';
import * as AuthContextModule from '../context/AuthContext.js';

describe('RoleGuard Component & Accessibility', () => {
  it('displays loading state with role="status" and aria-live when authenticating', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: null,
      circle: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <RoleGuard>
          <div>Protected Content</div>
        </RoleGuard>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading Care Circle/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('displays accessible access restricted screen when role is insufficient', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: '123', role: 'family', displayName: 'Family Member' },
      circle: null,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['elder']}>
          <div>Elder Only Content</div>
        </RoleGuard>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Access Restricted/i })).toBeInTheDocument();
    expect(screen.getByText(/Your current role is/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders protected children when role is authorized', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: '123', role: 'elder', displayName: 'Elder Rose' },
      circle: null,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['elder']}>
          <div>Welcome Elder Rose</div>
        </RoleGuard>
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome Elder Rose/i)).toBeInTheDocument();
  });
});

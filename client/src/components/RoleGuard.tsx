import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import type { Role } from '../types/auth.js';

interface RoleGuardProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
}

/**
 * Route protection guard checking authenticated role strictly via useAuth().
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { member, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 600,
        }}
      >
        Loading Care Circle...
      </div>
    );
  }

  if (!isAuthenticated || !member) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(member.role)) {
    return (
      <main className="container" role="main">
        <section
          className="card"
          aria-labelledby="restricted-heading"
          style={{ borderColor: 'var(--color-warning-border)', marginTop: '40px' }}
        >
          <h1 id="restricted-heading" style={{ color: 'var(--color-warning)', marginBottom: '12px' }}>
            Access Restricted
          </h1>
          <p style={{ marginBottom: '16px' }}>
            Your current role is <strong>{member.role}</strong>. This feature is restricted to:{' '}
            <strong>{allowedRoles.join(' or ')}</strong>.
          </p>
          <a href="/" className="btn btn-primary">
            Return to Dashboard
          </a>
        </section>
      </main>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

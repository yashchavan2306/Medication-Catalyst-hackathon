import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const ForbiddenPage: React.FC = () => {
  const { member } = useAuth();
  const homePath = member?.role === 'elder' ? '/today' : '/dashboard';

  return (
    <section
      className="card"
      aria-labelledby="forbidden-heading"
      style={{
        maxWidth: '600px',
        margin: '60px auto',
        padding: '36px',
        textAlign: 'center',
        borderColor: 'var(--color-warning-border)',
      }}
    >
      <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--color-warning-bg)', marginBottom: '16px' }}>
        <ShieldAlert size={48} color="var(--color-warning)" aria-hidden="true" />
      </div>

      <h1 id="forbidden-heading" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '12px' }}>
        403 &mdash; Access Restricted
      </h1>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: 'var(--font-size-lg)' }}>
        You don't have permission to access this section of CareCircle with your current role{' '}
        <strong>({member?.role || 'Guest'})</strong>.
      </p>

      <Link to={homePath} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Return to Your Home</span>
      </Link>
    </section>
  );
};

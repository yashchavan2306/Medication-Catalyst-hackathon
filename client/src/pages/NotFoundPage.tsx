import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated, member } = useAuth();
  const returnPath = !isAuthenticated ? '/' : member?.role === 'elder' ? '/today' : '/dashboard';

  return (
    <section
      className="card"
      aria-labelledby="notfound-heading"
      style={{
        maxWidth: '600px',
        margin: '60px auto',
        padding: '36px',
        textAlign: 'center',
        borderColor: 'var(--color-border)',
      }}
    >
      <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--color-neutral-badge)', marginBottom: '16px' }}>
        <AlertCircle size={48} color="var(--color-primary)" aria-hidden="true" />
      </div>

      <h1 id="notfound-heading" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '12px' }}>
        404 &mdash; Page Not Found
      </h1>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: 'var(--font-size-lg)' }}>
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link to={returnPath} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Return to Home</span>
      </Link>
    </section>
  );
};

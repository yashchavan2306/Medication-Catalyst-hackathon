import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { FormField } from '../components/FormField.js';
import { Heart, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [circleCode, setCircleCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const member = await login({
        circleCode: circleCode.trim().toUpperCase(),
        passcode: passcode.trim(),
        displayName: displayName.trim() || undefined,
      });

      // Role-aware redirect: elder -> /today, others -> /dashboard
      if (member.role === 'elder') {
        navigate('/today');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Invalid circle code or passcode');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="container"
      role="main"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        paddingTop: '20px',
        paddingBottom: '20px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)' }}>
          <Heart size={44} fill="var(--color-primary)" aria-hidden="true" />
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>CareCircle</h1>
        </div>
        <p style={{ marginTop: '8px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)' }}>
          Accessible Elderly Care &amp; Medication Coordination
        </p>
      </div>

      <section
        className="card"
        style={{ maxWidth: '480px', width: '100%', padding: '32px' }}
        aria-labelledby="login-heading"
      >
        <h2 id="login-heading" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: '20px' }}>
          Enter Your Care Circle
        </h2>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '2px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField
            id="login-code"
            label="Circle Code"
            required
            hint="The 9-character code for your Care Circle (e.g. CARE-1234)"
          >
            <div style={{ position: 'relative' }}>
              <input
                id="login-code"
                type="text"
                required
                placeholder="e.g. CARE-1234"
                value={circleCode}
                onChange={(e) => setCircleCode(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
              />
            </div>
          </FormField>

          <FormField
            id="login-passcode"
            label="Role Passcode"
            required
            hint="Your personal elder, caretaker, or family passcode"
          >
            <input
              id="login-passcode"
              type="password"
              required
              placeholder="Enter your secret passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="current-password"
            />
          </FormField>

          <FormField
            id="login-name"
            label="Your Display Name"
            hint="Optional name shown to other circle members"
          >
            <input
              id="login-name"
              type="text"
              placeholder="e.g. Rose or Nurse Adams"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </FormField>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            <LogIn size={20} aria-hidden="true" />
            <span>{isLoading ? 'Signing in...' : 'Enter Circle'}</span>
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: 'var(--font-size-sm)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
          }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Need to set up a new circle? </span>
          <Link to="/create-circle" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            Create a Care Circle
          </Link>
        </div>
      </section>
    </main>
  );
};

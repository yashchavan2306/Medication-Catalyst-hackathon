import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Heart, KeyRound, User, Hash } from 'lucide-react';

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
      await login({
        circleCode,
        passcode,
        displayName: displayName || undefined,
      });
      navigate('/');
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
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)' }}>
          <Heart size={44} fill="var(--color-primary)" aria-hidden="true" />
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>CareCircle</h1>
        </div>
        <p style={{ marginTop: '8px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)' }}>
          Elderly Care & Medication Management
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
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="login-code" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hash size={18} aria-hidden="true" />
              <span>Circle Code *</span>
            </label>
            <input
              id="login-code"
              type="text"
              required
              placeholder="e.g. CARE-1234"
              value={circleCode}
              onChange={(e) => setCircleCode(e.target.value)}
              autoCapitalize="characters"
            />
            <div className="input-hint">The unique code for your elderly family member's circle.</div>
          </div>

          <div>
            <label htmlFor="login-passcode" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={18} aria-hidden="true" />
              <span>Role Passcode *</span>
            </label>
            <input
              id="login-passcode"
              type="password"
              required
              placeholder="Your role passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <div className="input-hint">Enter Elder, Caretaker, or Family passcode.</div>
          </div>

          <div>
            <label htmlFor="login-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} aria-hidden="true" />
              <span>Your Name (optional)</span>
            </label>
            <input
              id="login-name"
              type="text"
              placeholder="e.g. Maria (Caretaker) or David"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ marginTop: '10px' }}
          >
            {isLoading ? 'Signing In...' : 'Enter Circle'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>
            Setting up care for an elderly loved one?
          </p>
          <Link to="/create-circle" className="btn btn-secondary" style={{ width: '100%' }}>
            Create New Care Circle
          </Link>
        </div>
      </section>
    </main>
  );
};

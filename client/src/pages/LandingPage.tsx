import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Heart,
  Users,
  LogIn,
  ShieldCheck,
  Clock,
  Volume2,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, member } = useAuth();

  if (isAuthenticated && member) {
    return <Navigate to={member.role === 'elder' ? '/today' : '/dashboard'} replace />;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Hero Section */}
      <section
        aria-labelledby="hero-heading"
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'linear-gradient(180deg, var(--color-primary-surface) 0%, var(--color-bg) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', color: 'var(--color-primary)', marginBottom: '16px' }}>
          <Heart size={48} fill="var(--color-primary)" aria-hidden="true" />
          <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>CareCircle</span>
        </div>

        <h1 id="hero-heading" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px', lineHeight: 1.25 }}>
          Accessible Elderly Care &amp; Medication Coordination
        </h1>

        <p
          style={{
            fontSize: 'var(--font-size-xl)',
            color: 'var(--color-text-muted)',
            maxWidth: '680px',
            margin: '0 auto 32px auto',
          }}
        >
          A unified, senior-first platform empowering elders to manage their daily health with confidence, while keeping caretakers and family seamlessly informed.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ fontSize: 'var(--font-size-lg)', padding: '14px 28px' }}
          >
            <LogIn size={22} aria-hidden="true" />
            <span>Enter Your Circle</span>
          </Link>

          <Link
            to="/create-circle"
            className="btn btn-secondary"
            style={{ fontSize: 'var(--font-size-lg)', padding: '14px 28px' }}
          >
            <Users size={22} aria-hidden="true" />
            <span>Create New Circle</span>
          </Link>
        </div>
      </section>

      {/* Role-Based Synergy Cards */}
      <section aria-labelledby="roles-heading" style={{ marginBottom: '48px' }}>
        <h2 id="roles-heading" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: '28px' }}>
          Designed for Every Role in the Care Circle
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Elder Card */}
          <article className="card" style={{ borderTop: '6px solid var(--color-success)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Heart size={28} color="var(--color-success)" aria-hidden="true" />
              <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>For Elders</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', flex: 1 }}>
              Huge high-contrast dose cards, large 1-tap "I took it" buttons, spoken audio assistance via Web Speech API, and ultimate authority to approve medication changes.
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>18px+ readable fonts &amp; big touch targets</li>
              <li>Voice read-aloud schedule</li>
              <li>Daily streak motivation</li>
            </ul>
          </article>

          {/* Caretaker Card */}
          <article className="card" style={{ borderTop: '6px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} color="var(--color-primary)" aria-hidden="true" />
              <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>For Caretakers</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', flex: 1 }}>
              Comprehensive real-time dashboard, adherence tracking, medication request workflows requiring elder consent, low-refill alerts, and doctor appointment scheduling.
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Change request &amp; approval system</li>
              <li>Refill threshold tracking</li>
              <li>Appointment coordination</li>
            </ul>
          </article>

          {/* Family Card */}
          <article className="card" style={{ borderTop: '6px solid var(--color-border-strong)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={28} color="var(--color-text-muted)" aria-hidden="true" />
              <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>For Family</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', flex: 1 }}>
              Transparent peace-of-mind access. View today's medication logs, attendance records, upcoming appointments, and printable emergency medical cards without interfering.
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Read-only adherence reports</li>
              <li>Complete circle activity audit trail</li>
              <li>Wallet-ready emergency card</li>
            </ul>
          </article>
        </div>
      </section>

      {/* Accessibility & Features Highlights */}
      <section
        className="card"
        aria-labelledby="accessibility-features-heading"
        style={{ padding: '32px', backgroundColor: 'var(--color-surface)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Sparkles size={28} color="var(--color-primary)" aria-hidden="true" />
          <h2 id="accessibility-features-heading" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Built Ground-Up for Accessibility (WCAG 2.1 AA/AAA)
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={24} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>18px+ Base Font Size</strong>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Readable typography with integrated text-size switcher (up to 24px base).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Volume2 size={24} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Web Speech Read-Aloud</strong>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Listen to daily dose schedules and instructions with native text-to-speech.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Clock size={24} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>44px+ Touch Targets</strong>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Spacious buttons and interactive controls tailored for touch and motor accessibility.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <FileText size={24} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Printable Emergency Card</strong>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                One-click print ready profile containing essential doctor, allergy, and active medication data.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

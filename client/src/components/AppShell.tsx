import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { StatusPill } from './StatusPill.js';
import {
  Heart,
  Calendar,
  Pill,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  FileBarChart2,
  Clock,
  PhoneCall,
  Type,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { member, circle, logout } = useAuth();
  const navigate = useNavigate();

  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carecircle_text_size') as 'normal' | 'large' | 'xlarge';
      return saved || 'normal';
    }
    return 'normal';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (textSize === 'normal') {
        document.documentElement.removeAttribute('data-text-size');
      } else {
        document.documentElement.setAttribute('data-text-size', textSize);
      }
      localStorage.setItem('carecircle_text_size', textSize);
    }
  }, [textSize]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = member?.role;
  const homePath = role === 'elder' ? '/today' : '/dashboard';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Skip Link for Keyboard & Screen Reader Users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top Header */}
      <header
        role="banner"
        className="no-print"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '2px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NavLink
              to={homePath}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                color: 'var(--color-primary)',
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 800,
              }}
              aria-label="CareCircle Home"
            >
              <Heart size={32} aria-hidden="true" fill="var(--color-primary)" />
              <span>CareCircle</span>
            </NavLink>

            {circle && (
              <div
                style={{
                  backgroundColor: 'var(--color-primary-surface)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: 'var(--color-primary-active)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span>{circle.name}</span>
                <span style={{ marginLeft: '6px', fontWeight: 700 }}>({circle.code})</span>
              </div>
            )}
          </div>

          {/* Right Header Controls: Text Size Toggle & User Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Accessible Text Size Toggle */}
            <div
              role="group"
              aria-label="Text size controls"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--color-bg)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Type size={18} aria-hidden="true" style={{ color: 'var(--color-text-muted)', marginRight: '2px' }} />
              <button
                type="button"
                onClick={() => setTextSize('normal')}
                aria-pressed={textSize === 'normal'}
                title="Normal text size (18px)"
                style={{
                  minHeight: '36px',
                  padding: '4px 10px',
                  fontSize: '15px',
                  fontWeight: textSize === 'normal' ? 800 : 500,
                  backgroundColor: textSize === 'normal' ? 'var(--color-surface)' : 'transparent',
                  borderColor: textSize === 'normal' ? 'var(--color-primary)' : 'transparent',
                  color: textSize === 'normal' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setTextSize('large')}
                aria-pressed={textSize === 'large'}
                title="Large text size (21px)"
                style={{
                  minHeight: '36px',
                  padding: '4px 10px',
                  fontSize: '18px',
                  fontWeight: textSize === 'large' ? 800 : 500,
                  backgroundColor: textSize === 'large' ? 'var(--color-surface)' : 'transparent',
                  borderColor: textSize === 'large' ? 'var(--color-primary)' : 'transparent',
                  color: textSize === 'large' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setTextSize('xlarge')}
                aria-pressed={textSize === 'xlarge'}
                title="Extra large text size (24px)"
                style={{
                  minHeight: '36px',
                  padding: '4px 10px',
                  fontSize: '20px',
                  fontWeight: textSize === 'xlarge' ? 800 : 500,
                  backgroundColor: textSize === 'xlarge' ? 'var(--color-surface)' : 'transparent',
                  borderColor: textSize === 'xlarge' ? 'var(--color-primary)' : 'transparent',
                  color: textSize === 'xlarge' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                A++
              </button>
            </div>

            {member && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>{member.displayName}</span>
                <StatusPill status={member.role} />
              </div>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ minHeight: '40px', padding: '6px 14px' }}
              aria-label="Log out of CareCircle"
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Role-Aware Navigation Bar */}
        <nav
          role="navigation"
          aria-label="Main Navigation"
          style={{
            backgroundColor: 'var(--color-bg)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '6px',
            paddingBottom: '6px',
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              overflowX: 'auto',
              paddingTop: '4px',
              paddingBottom: '4px',
            }}
          >
            {/* Elder Views */}
            {role === 'elder' && (
              <>
                <NavLink
                  to="/today"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Clock size={18} aria-hidden="true" />
                  <span>Today's Doses</span>
                </NavLink>

                <NavLink
                  to="/medications"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Pill size={18} aria-hidden="true" />
                  <span>My Medications</span>
                </NavLink>

                <NavLink
                  to="/approvals"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span>Approvals</span>
                </NavLink>

                <NavLink
                  to="/appointments"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Calendar size={18} aria-hidden="true" />
                  <span>Appointments</span>
                </NavLink>

                <NavLink
                  to="/emergency"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <PhoneCall size={18} aria-hidden="true" />
                  <span>Emergency Card</span>
                </NavLink>
              </>
            )}

            {/* Caretaker Views */}
            {role === 'caretaker' && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <LayoutDashboard size={18} aria-hidden="true" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/today"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Clock size={18} aria-hidden="true" />
                  <span>Elder Today</span>
                </NavLink>

                <NavLink
                  to="/medications"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Pill size={18} aria-hidden="true" />
                  <span>Medications</span>
                </NavLink>

                <NavLink
                  to="/appointments"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Calendar size={18} aria-hidden="true" />
                  <span>Appointments</span>
                </NavLink>

                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <FileBarChart2 size={18} aria-hidden="true" />
                  <span>Reports</span>
                </NavLink>

                <NavLink
                  to="/activity"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Clock size={18} aria-hidden="true" />
                  <span>Activity Log</span>
                </NavLink>

                <NavLink
                  to="/emergency"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <PhoneCall size={18} aria-hidden="true" />
                  <span>Emergency Card</span>
                </NavLink>
              </>
            )}

            {/* Family Views */}
            {role === 'family' && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <LayoutDashboard size={18} aria-hidden="true" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/today"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Clock size={18} aria-hidden="true" />
                  <span>Elder Today</span>
                </NavLink>

                <NavLink
                  to="/medications"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Pill size={18} aria-hidden="true" />
                  <span>Medications (View)</span>
                </NavLink>

                <NavLink
                  to="/appointments"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Calendar size={18} aria-hidden="true" />
                  <span>Appointments</span>
                </NavLink>

                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <FileBarChart2 size={18} aria-hidden="true" />
                  <span>Reports</span>
                </NavLink>

                <NavLink
                  to="/activity"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <Clock size={18} aria-hidden="true" />
                  <span>Activity Log</span>
                </NavLink>

                <NavLink
                  to="/emergency"
                  className={({ isActive }) =>
                    `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                  style={{ minHeight: '40px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <PhoneCall size={18} aria-hidden="true" />
                  <span>Emergency Card</span>
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main id="main-content" role="main" className="container" tabIndex={-1} style={{ flex: 1, outline: 'none' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="no-print"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: '24px 16px',
          marginTop: 'auto',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ padding: 0 }}>
          <p>CareCircle &mdash; Accessible Elderly Care & Medication Coordination</p>
          <p style={{ marginTop: '4px', fontSize: '14px' }}>
            Built with WCAG 2.1 AA/AAA accessibility standards &bull; High Contrast &bull; Large Touch Targets &bull; Screen Reader Optimized
          </p>
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useQuery } from '@tanstack/react-query';
import { getNotificationsApi } from '../api/commonApi.js';
import { getApprovalsApi } from '../api/medicationsApi.js';
import { Bell, Heart, Calendar, Pill, ShieldCheck, LogOut, Settings } from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const { member, circle, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  // Poll notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotificationsApi(true),
    refetchInterval: 15000,
    enabled: !!member,
  });

  // Check pending approvals for elder
  const { data: pendingApprovals } = useQuery({
    queryKey: ['approvals', 'PENDING'],
    queryFn: () => getApprovalsApi('PENDING'),
    refetchInterval: 15000,
    enabled: member?.role === 'elder',
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const pendingCount = pendingApprovals?.length ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      role="banner"
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
        {/* Brand / Circle identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NavLink
            to="/"
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
            <Heart size={30} aria-hidden="true" fill="var(--color-primary)" />
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
              <span>Circle: {circle.name}</span>
              <span style={{ marginLeft: '8px', fontWeight: 700 }}>({circle.code})</span>
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav role="navigation" aria-label="Main navigation">
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              listStyle: 'none',
              flexWrap: 'wrap',
            }}
          >
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/medications"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Pill size={20} aria-hidden="true" />
                <span>Medications</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/approvals"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{ position: 'relative' }}
              >
                <ShieldCheck size={20} aria-hidden="true" />
                <span>Approvals</span>
                {pendingCount > 0 && (
                  <span
                    className="badge badge-warning"
                    style={{
                      padding: '2px 8px',
                      fontSize: '13px',
                      marginLeft: '4px',
                    }}
                    aria-label={`${pendingCount} pending approvals`}
                  >
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/appointments"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Calendar size={20} aria-hidden="true" />
                <span>Visits</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/vitals"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Heart size={20} aria-hidden="true" />
                <span>Vitals</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Member role & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {member && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{member.displayName}</span>
              <span
                className={`badge ${
                  member.role === 'elder'
                    ? 'badge-success'
                    : member.role === 'caretaker'
                      ? 'badge-warning'
                      : 'badge-neutral'
                }`}
              >
                {member.role.toUpperCase()}
              </span>
            </div>
          )}

          {/* Notifications Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label={`Notifications, ${unreadCount} unread`}
            style={{ position: 'relative', padding: '10px 14px' }}
          >
            <Bell size={22} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="badge badge-danger"
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  padding: '2px 6px',
                  fontSize: '12px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Circle settings modal trigger (Elder only) */}
          {member?.role === 'elder' && onOpenSettings && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenSettings}
              aria-label="Circle Settings and Passcodes"
              style={{ padding: '10px 14px' }}
            >
              <Settings size={22} aria-hidden="true" />
            </button>
          )}

          {/* Logout button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
            aria-label="Sign out of Care Circle"
            style={{ padding: '10px 14px' }}
          >
            <LogOut size={22} aria-hidden="true" />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </div>

      {/* Notifications Drawer */}
      {showNotifs && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          style={{
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            padding: '16px 0',
          }}
        >
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Circle Notifications</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNotifs(false)}
                style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
              >
                Close
              </button>
            </div>
            {notifData?.notifications.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No unread notifications right now.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifData?.notifications.slice(0, 5).map((n) => (
                  <li
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{n.title}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>{n.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

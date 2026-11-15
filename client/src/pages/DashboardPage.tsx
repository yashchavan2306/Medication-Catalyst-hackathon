import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { StatusPill } from '../components/StatusPill.js';
import { getDashboardApi } from '../api/commonApi.js';
import { takeDoseApi, skipDoseApi } from '../api/medicationsApi.js';
import type { DashboardResponse } from '../types/common.js';
import type { TodayDose } from '../types/medication.js';
import {
  Heart,
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { member } = useAuth();
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isFamily = member?.role === 'family';

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardApi();
      setDashboard(data);
    } catch {
      showToast('Could not load circle dashboard', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleTakeDose = async (dose: TodayDose) => {
    try {
      await takeDoseApi(dose.id);
      showToast(`Marked ${dose.medication.name} as taken`, 'success');
      loadDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record dose';
      showToast(msg, 'error');
    }
  };

  const handleSkipDose = async (dose: TodayDose) => {
    try {
      await skipDoseApi(dose.id, 'Skipped from dashboard');
      showToast(`Skipped ${dose.medication.name}`, 'warning');
      loadDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to skip dose';
      showToast(msg, 'error');
    }
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 700,
        }}
      >
        Loading Care Circle dashboard...
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Dashboard Unavailable</h2>
        <p>Please check your connection or sign in again.</p>
      </div>
    );
  }

  const { stats, today, lowRefillMeds, upcomingAppointments, recentActivity, circle } = dashboard;

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Banner */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
            {circle.elderName}'s Care Overview
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
            Circle Code: <strong>{circle.code}</strong> &bull; Viewing as{' '}
            <strong style={{ textTransform: 'capitalize' }}>{member?.role}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/today" className="btn btn-secondary">
            <Clock size={18} aria-hidden="true" />
            <span>View Elder Today Screen</span>
          </Link>
          <Link to="/emergency" className="btn btn-secondary">
            <Heart size={18} aria-hidden="true" fill="var(--color-danger)" color="var(--color-danger)" />
            <span>Emergency Card</span>
          </Link>
        </div>
      </header>

      {/* Low Refill Alert Banner */}
      {lowRefillMeds.length > 0 && (
        <aside
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: 'var(--color-warning-bg)',
            border: '2px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={28} color="var(--color-warning)" aria-hidden="true" />
            <div>
              <div style={{ fontWeight: 800, color: 'var(--color-warning)' }}>
                Low Refill Alert ({lowRefillMeds.length} {lowRefillMeds.length === 1 ? 'medication' : 'medications'}):
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
                {lowRefillMeds.map((m) => `${m.name} (${m.remainingQuantity} left)`).join(', ')}
              </div>
            </div>
          </div>
          <Link to="/medications" className="btn btn-secondary" style={{ minHeight: '36px', padding: '6px 14px' }}>
            Manage Refills
          </Link>
        </aside>
      )}

      {/* Key Metrics Grid */}
      <section aria-labelledby="metrics-heading" style={{ marginBottom: '32px' }}>
        <h2 id="metrics-heading" className="sr-only">
          Circle Health Metrics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {/* Today Adherence */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Today's Adherence
              </span>
              <CheckCircle2 size={20} color="var(--color-primary)" aria-hidden="true" />
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {today.summary.adherencePercentage}%
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {today.summary.takenCount} of {today.summary.totalScheduled} doses taken
            </div>
          </div>

          {/* 7-Day Adherence */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                7-Day Adherence
              </span>
              <TrendingUp size={20} color="var(--color-success)" aria-hidden="true" />
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {stats.weeklyAdherenceRate}%
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              <Link to="/reports" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                View 7-day report &rarr;
              </Link>
            </div>
          </div>

          {/* Active Medications */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-border-strong)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Active Medications
              </span>
              <Pill size={20} color="var(--color-primary)" aria-hidden="true" />
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {stats.totalActiveMedications}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              <Link to="/medications" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                View list &rarr;
              </Link>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Pending Approvals
              </span>
              <ShieldAlert size={20} color="var(--color-warning)" aria-hidden="true" />
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {stats.pendingApprovalsCount}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {stats.pendingApprovalsCount > 0 ? 'Awaiting Elder sign-off' : 'All changes reviewed'}
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Today's Schedule on Left, Appointments & Activity on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        {/* Today's Schedule Timeline */}
        <section aria-labelledby="today-schedule-heading" className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 id="today-schedule-heading" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
              Today's Schedule
            </h2>
            <Link to="/today" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary)' }}>
              Full Screen &rarr;
            </Link>
          </div>

          {today.doses.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', padding: '24px 0', textAlign: 'center' }}>
              No doses scheduled for today.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {today.doses.map((dose) => (
                <div
                  key={dose.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: dose.status === 'TAKEN' ? 'var(--color-bg)' : 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
                          {dose.scheduledTime}
                        </span>
                        <StatusPill status={dose.status} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                        {dose.medication.name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        {dose.medication.dosage} {dose.medication.instructions ? `• ${dose.medication.instructions}` : ''}
                      </div>
                    </div>

                    {/* Hide edit actions for family */}
                    {!isFamily && dose.status !== 'TAKEN' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-success"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                          onClick={() => handleTakeDose(dose)}
                          aria-label={`Mark ${dose.medication.name} as taken`}
                        >
                          Take
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                          onClick={() => handleSkipDose(dose)}
                          aria-label={`Skip ${dose.medication.name}`}
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Appointments & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Upcoming Appointments */}
          <section aria-labelledby="upcoming-appointments-heading" className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="upcoming-appointments-heading" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>
                Upcoming Appointments
              </h2>
              <Link to="/appointments" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary)' }}>
                View all &rarr;
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No appointments currently scheduled.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingAppointments.map((app) => (
                  <div
                    key={app.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{app.title}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      Dr: {app.doctorName} &bull; {new Date(app.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      Location: {app.location}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity Audit Trail */}
          <section aria-labelledby="recent-activity-heading" className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="recent-activity-heading" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>
                Recent Circle Activity
              </h2>
              <Link to="/activity" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary)' }}>
                Audit Log &rarr;
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No recent activity recorded yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{act.description}</span>
                      <StatusPill status={act.actorRole} />
                    </div>
                    <div style={{ color: 'var(--color-text-light)', marginTop: '2px', fontSize: '13px' }}>
                      {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

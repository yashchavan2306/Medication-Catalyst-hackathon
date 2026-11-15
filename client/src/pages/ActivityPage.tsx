import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { StatusPill } from '../components/StatusPill.js';
import { getActivityApi } from '../api/commonApi.js';
import type { ActivityItem } from '../types/common.js';
import {
  Clock,
  Filter,
  Activity,
} from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadActivity = useCallback(async () => {
    try {
      const data = await getActivityApi(100);
      setActivities(data);
    } catch {
      showToast('Could not load activity log', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const filteredActivities = activities.filter((act) => {
    if (roleFilter === 'ALL') return true;
    return act.actorRole.toLowerCase() === roleFilter.toLowerCase();
  });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Activity Audit Trail</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Full accountability log of medication takes, adjustments, and member sign-ins
          </p>
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={18} color="var(--color-text-muted)" aria-hidden="true" />
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Filter by Role:</span>
          {(['ALL', 'elder', 'caretaker', 'family'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '36px', padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}
              onClick={() => setRoleFilter(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '40vh',
            fontSize: 'var(--font-size-xl)',
          }}
        >
          Loading circle activity...
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Activity size={44} color="var(--color-text-muted)" aria-hidden="true" style={{ margin: '0 auto 12px auto' }} />
          <h2>No activity records found</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
            There are no logs matching your current filter.
          </p>
        </div>
      ) : (
        <section aria-labelledby="activity-list-heading" className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <h2 id="activity-list-heading" className="sr-only">
            List of Circle Activities
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredActivities.map((item, index) => {
              const dateObj = new Date(item.createdAt);
              const formattedDate = dateObj.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: index < filteredActivities.length - 1 ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: index % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-primary-surface)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                      }}
                      aria-hidden="true"
                    >
                      <Clock size={20} />
                    </div>

                    <div>
                      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-text-main)' }}>
                        {item.description}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        <span>
                          By <strong>{item.actorName}</strong>
                        </span>
                        <StatusPill status={item.actorRole} />
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    <div>{formattedDate}</div>
                    <div style={{ fontWeight: 600 }}>{formattedTime}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

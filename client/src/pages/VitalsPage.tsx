import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { apiFetch } from '../api/client.js';
import type { VitalLog } from '../types/common.js';
import { VitalModal } from '../components/VitalModal.js';
import { Heart, Plus, Activity } from 'lucide-react';

export const VitalsPage: React.FC = () => {
  const { member } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canEdit = member?.role === 'elder' || member?.role === 'caretaker';

  const { data: vitals = [], isLoading, error } = useQuery<VitalLog[]>({
    queryKey: ['vitals'],
    queryFn: () => apiFetch<VitalLog[]>('/vitals?limit=30'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<VitalLog>) =>
      apiFetch('/vitals', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('Health vitals recorded successfully', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  return (
    <main className="container" role="main" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Heart size={32} color="var(--color-primary)" aria-hidden="true" />
            <span>Health Check-ins & Daily Vitals</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Track daily blood pressure, blood glucose, heart rate, and overall mood.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            aria-label="Record new vital signs check-in"
          >
            <Plus size={20} aria-hidden="true" />
            <span>Record Check-in</span>
          </button>
        )}
      </div>

      {isLoading && (
        <div role="status" aria-live="polite" style={{ padding: '40px 0', textAlign: 'center', fontWeight: 600 }}>
          Loading health vitals...
        </div>
      )}

      {error && (
        <div role="alert" className="card" style={{ borderColor: 'var(--color-danger-border)' }}>
          <p style={{ color: 'var(--color-danger)' }}>Error loading vitals: {(error as Error).message}</p>
        </div>
      )}

      {!isLoading && vitals.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
          <Activity size={48} style={{ margin: '0 auto 12px auto', color: 'var(--color-text-muted)' }} aria-hidden="true" />
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>No vital readings recorded yet</h2>
          <p style={{ marginTop: '8px' }}>Log your daily health check-in to monitor trends.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {vitals.map((item) => (
          <article
            key={item.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderLeft: '6px solid var(--color-primary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>
                {new Date(item.recordedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {item.mood && (
                <span className="badge badge-success" style={{ fontWeight: 700 }}>
                  Mood: {item.mood}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
              {item.bloodPressureSystolic && item.bloodPressureDiastolic && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>BP: </span>
                  <strong>{item.bloodPressureSystolic}/{item.bloodPressureDiastolic} mmHg</strong>
                </div>
              )}

              {item.bloodSugar && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Blood Sugar: </span>
                  <strong>{item.bloodSugar} mg/dL</strong>
                </div>
              )}

              {item.heartRate && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Pulse: </span>
                  <strong>{item.heartRate} BPM</strong>
                </div>
              )}
            </div>

            {item.notes && (
              <div style={{ fontSize: 'var(--font-size-sm)', fontStyle: 'italic', color: 'var(--color-text-light)' }}>
                "{item.notes}"
              </div>
            )}

            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
              Recorded by {item.recordedByName} ({item.recordedByRole})
            </div>
          </article>
        ))}
      </div>

      <VitalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
      />
    </main>
  );
};

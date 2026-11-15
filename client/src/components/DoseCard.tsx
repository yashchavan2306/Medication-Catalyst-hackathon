import React, { useState } from 'react';
import type { DailyDoseItem } from '../types/medication.js';
import { useAuth } from '../context/AuthContext.js';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface DoseCardProps {
  dose: DailyDoseItem;
  onRecord: (status: 'TAKEN' | 'SKIPPED' | 'MISSED', notes?: string) => Promise<void>;
}

export const DoseCard: React.FC<DoseCardProps> = ({ dose, onRecord }) => {
  const { member } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const canEdit = member?.role === 'elder' || member?.role === 'caretaker';

  const handleAction = async (status: 'TAKEN' | 'SKIPPED') => {
    setIsSubmitting(true);
    try {
      await onRecord(status);
      setActionFeedback(`Marked as ${status}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (dose.status === 'TAKEN') {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Taken</span>
        </span>
      );
    }
    if (dose.status === 'SKIPPED') {
      return (
        <span className="badge badge-warning">
          <AlertCircle size={18} aria-hidden="true" />
          <span>Skipped</span>
        </span>
      );
    }
    if (dose.status === 'MISSED') {
      return (
        <span className="badge badge-danger">
          <XCircle size={18} aria-hidden="true" />
          <span>Missed</span>
        </span>
      );
    }
    return (
      <span className="badge badge-neutral">
        <Clock size={18} aria-hidden="true" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <article
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        borderLeft: `6px solid ${
          dose.status === 'TAKEN'
            ? 'var(--color-success)'
            : dose.status === 'MISSED'
              ? 'var(--color-danger)'
              : dose.status === 'SKIPPED'
                ? 'var(--color-warning)'
                : 'var(--color-primary)'
        }`,
      }}
      aria-label={`Dose for ${dose.medicationName} at ${dose.scheduledTime}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
              {dose.scheduledTime}
            </span>
            {getStatusBadge()}
          </div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {dose.medicationName}
          </h3>
          <p style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Dosage: {dose.dosage}
          </p>
          {dose.instructions && (
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px', fontStyle: 'italic' }}>
              Instructions: {dose.instructions}
            </p>
          )}
        </div>

        <div style={{ textAlign: 'right', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          <div>Stock: {dose.remainingQuantity} remaining</div>
          {dose.recordedByName && (
            <div style={{ marginTop: '4px', fontSize: '13px' }}>
              Logged by: {dose.recordedByName} ({dose.recordedByRole})
            </div>
          )}
        </div>
      </div>

      {/* Screen Reader live update */}
      <div className="sr-only" role="status" aria-live="polite">
        {actionFeedback}
      </div>

      {/* Action Buttons for Elder & Caretaker */}
      {canEdit && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-success"
            onClick={() => handleAction('TAKEN')}
            disabled={isSubmitting || dose.status === 'TAKEN'}
            aria-label={`Mark ${dose.medicationName} at ${dose.scheduledTime} as taken`}
            style={{ flex: 1 }}
          >
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>Mark as Taken</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleAction('SKIPPED')}
            disabled={isSubmitting || dose.status === 'SKIPPED'}
            aria-label={`Mark ${dose.medicationName} at ${dose.scheduledTime} as skipped`}
          >
            <span>Skip</span>
          </button>
        </div>
      )}

      {!canEdit && (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Family view: read-only access
        </div>
      )}
    </article>
  );
};

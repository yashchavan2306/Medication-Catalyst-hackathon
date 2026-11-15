import React, { useState } from 'react';
import type { MedicationChangeRequest } from '../types/medication.js';
import { useAuth } from '../context/AuthContext.js';
import { Check, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface ApprovalCardProps {
  request: MedicationChangeRequest;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ request, onApprove, onReject }) => {
  const { member } = useAuth();
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);

  const isElder = member?.role === 'elder';

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(request.id, reviewNotes || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(request.id, reviewNotes || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const proposed = request.proposedData;
  const current = request.currentData;

  const getChangeTypeBadge = () => {
    if (request.changeType === 'CREATE') {
      return <span className="badge badge-success">New Medication</span>;
    }
    if (request.changeType === 'UPDATE') {
      return <span className="badge badge-warning">Medication Update</span>;
    }
    return <span className="badge badge-danger">Medication Removal</span>;
  };

  return (
    <article
      className="card"
      style={{
        borderLeft: '6px solid var(--color-warning)',
        marginBottom: '16px',
      }}
      aria-labelledby={`approval-title-${request.id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            {getChangeTypeBadge()}
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Requested by <strong>{request.requestedByName}</strong>
            </span>
          </div>
          <h3 id={`approval-title-${request.id}`} style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>
            {proposed.name || request.medication?.name} {proposed.dosage ? `(${proposed.dosage})` : ''}
          </h3>
          {request.reason && (
            <p style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
              Reason: "{request.reason}"
            </p>
          )}
        </div>

        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {new Date(request.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Change diff / proposed details */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>Proposed Details:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          <div>
            <strong>Frequency:</strong> {proposed.frequency || 'N/A'}
          </div>
          <div>
            <strong>Times:</strong>{' '}
            {proposed.timesOfDay && Array.isArray(proposed.timesOfDay) ? proposed.timesOfDay.join(', ') : 'N/A'}
          </div>
          <div>
            <strong>Purpose:</strong> {proposed.purpose || 'None'}
          </div>
          <div>
            <strong>Remaining Stock:</strong> {proposed.remainingQuantity ?? 'N/A'}
          </div>
        </div>

        {/* If updating, show previous comparison */}
        {request.changeType === 'UPDATE' && current && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Previous values:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
              <span>{current.name} {current.dosage} ({current.frequency})</span>
              <ArrowRight size={16} aria-hidden="true" />
              <strong style={{ color: 'var(--color-text-main)' }}>
                {proposed.name || current.name} {proposed.dosage || current.dosage} ({proposed.frequency || current.frequency})
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Action / Review Area */}
      {isElder && request.status === 'PENDING' && (
        <div style={{ marginTop: '16px' }}>
          {showNotesInput && (
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor={`review-notes-${request.id}`}>Review Note (optional)</label>
              <input
                id={`review-notes-${request.id}`}
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Approved, will pick up at pharmacy tomorrow"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleApprove}
              disabled={isSubmitting}
              aria-label={`Approve medication request for ${proposed.name || request.medication?.name}`}
            >
              <Check size={20} aria-hidden="true" />
              <span>Approve Change</span>
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleReject}
              disabled={isSubmitting}
              aria-label={`Reject medication request for ${proposed.name || request.medication?.name}`}
            >
              <X size={20} aria-hidden="true" />
              <span>Decline</span>
            </button>
            {!showNotesInput && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNotesInput(true)}
              >
                Add Note
              </button>
            )}
          </div>
        </div>
      )}

      {!isElder && request.status === 'PENDING' && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-warning)',
            fontWeight: 600,
          }}
        >
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Pending Elder Approval</span>
        </div>
      )}

      {request.status !== 'PENDING' && (
        <div style={{ marginTop: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Reviewed by <strong>{request.reviewedByName}</strong>: <em>{request.reviewNotes || request.status}</em>
        </div>
      )}
    </article>
  );
};

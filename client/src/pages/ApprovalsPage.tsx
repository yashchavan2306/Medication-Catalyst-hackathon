import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { StatusPill } from '../components/StatusPill.js';
import {
  getApprovalsApi,
  approveRequestApi,
  rejectRequestApi,
} from '../api/medicationsApi.js';
import type { MedicationChangeRequest } from '../types/medication.js';
import {
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { member } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<MedicationChangeRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isElder = member?.role === 'elder';

  const loadRequests = useCallback(async () => {
    try {
      const data = await getApprovalsApi(filterStatus);
      setRequests(data);
    } catch {
      showToast('Could not load approval requests', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (req: MedicationChangeRequest) => {
    setProcessingId(req.id);
    try {
      await approveRequestApi(req.id, reviewNotesMap[req.id] || undefined);
      showToast('Change request approved and applied', 'success');
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve request';
      showToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: MedicationChangeRequest) => {
    setProcessingId(req.id);
    try {
      await rejectRequestApi(req.id, reviewNotesMap[req.id] || undefined);
      showToast('Change request rejected', 'warning');
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request';
      showToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getChangeBadge = (type: string) => {
    switch (type) {
      case 'CREATE':
        return <span className="badge badge-success">New Medication Request</span>;
      case 'UPDATE':
        return <span className="badge badge-warning">Medication Update Request</span>;
      case 'DELETE':
        return <span className="badge badge-danger">Discontinuation Request</span>;
      default:
        return <span className="badge badge-neutral">{type}</span>;
    }
  };

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
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Medication Approvals</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Review and sign off on medication changes proposed by caretakers
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${filterStatus === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '38px', padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pending
          </button>
          <button
            type="button"
            className={`btn ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '38px', padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
            onClick={() => setFilterStatus('ALL')}
          >
            All History
          </button>
        </div>
      </header>

      {!isElder && (
        <aside
          role="note"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--color-primary-surface)',
            border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: 'var(--font-size-base)',
          }}
        >
          <strong>Notice:</strong> As a {member?.role}, you can monitor the status of change requests.
          Only the <strong>Elder</strong> has final authorization to approve or reject them.
        </aside>
      )}

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
          Loading approval requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <ShieldCheck size={44} color="var(--color-success)" aria-hidden="true" style={{ margin: '0 auto 12px auto' }} />
          <h2>All clear! No pending approvals</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
            There are currently no medication modifications awaiting review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {requests.map((req) => {
            const proposed = req.proposedData;
            const current = req.currentData;
            const isPending = req.status === 'PENDING';
            const isBusy = processingId === req.id;

            return (
              <article
                key={req.id}
                className="card"
                style={{
                  borderLeft: `6px solid ${
                    req.status === 'APPROVED'
                      ? 'var(--color-success)'
                      : req.status === 'REJECTED'
                        ? 'var(--color-danger)'
                        : 'var(--color-warning)'
                  }`,
                  boxShadow: 'var(--shadow-sm)',
                }}
                aria-labelledby={`req-title-${req.id}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      {getChangeBadge(req.changeType)}
                      <StatusPill status={req.status} />
                    </div>
                    <h2 id={`req-title-${req.id}`} style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                      {proposed.name || req.medication?.name} {proposed.dosage ? `(${proposed.dosage})` : ''}
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Requested by <strong>{req.requestedByName}</strong> ({req.requestedByRole}) on{' '}
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {req.reviewedByName && (
                    <div style={{ fontSize: 'var(--font-size-sm)', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                      Reviewed by: <strong>{req.reviewedByName}</strong>
                      {req.reviewedAt && (
                        <div>{new Date(req.reviewedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reason note */}
                {req.reason && (
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-bg)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '16px',
                      fontStyle: 'italic',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-main)',
                      borderLeft: '3px solid var(--color-primary)',
                    }}
                  >
                    <strong>Caretaker Note:</strong> "{req.reason}"
                  </div>
                )}

                {/* Details / Diff comparison */}
                <div
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    border: '1px solid var(--color-border)',
                    marginBottom: '20px',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>Medication Details:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <strong>Dosage:</strong> {proposed.dosage || current?.dosage || 'N/A'}
                    </div>
                    <div>
                      <strong>Frequency:</strong> {proposed.frequency || current?.frequency || 'N/A'}
                    </div>
                    <div>
                      <strong>Scheduled Times:</strong>{' '}
                      {Array.isArray(proposed.timesOfDay) ? proposed.timesOfDay.join(', ') : 'N/A'}
                    </div>
                    <div>
                      <strong>Purpose:</strong> {proposed.purpose || current?.purpose || 'N/A'}
                    </div>
                    <div>
                      <strong>Instructions:</strong> {proposed.instructions || current?.instructions || 'Standard'}
                    </div>
                    <div>
                      <strong>Quantity / Threshold:</strong> {proposed.remainingQuantity ?? current?.remainingQuantity ?? 30} / {proposed.refillThreshold ?? current?.refillThreshold ?? 5}
                    </div>
                  </div>
                </div>

                {/* Review Notes Input & Action Buttons for Elder */}
                {isElder && isPending && (
                  <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '16px' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <label htmlFor={`review-notes-${req.id}`} style={{ fontSize: 'var(--font-size-sm)' }}>
                        Review Note / Elder Response (Optional):
                      </label>
                      <input
                        id={`review-notes-${req.id}`}
                        type="text"
                        placeholder="e.g. Looks good, will start tomorrow"
                        value={reviewNotesMap[req.id] || ''}
                        onChange={(e) =>
                          setReviewNotesMap({ ...reviewNotesMap, [req.id]: e.target.value })
                        }
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={isBusy}
                        onClick={() => handleReject(req)}
                        aria-label={`Reject request for ${proposed.name || req.medication?.name}`}
                      >
                        <X size={18} aria-hidden="true" />
                        <span>{isBusy ? 'Processing...' : 'Reject Request'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={isBusy}
                        onClick={() => handleApprove(req)}
                        aria-label={`Approve request for ${proposed.name || req.medication?.name}`}
                      >
                        <Check size={18} aria-hidden="true" />
                        <span>{isBusy ? 'Processing...' : 'Approve & Apply'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

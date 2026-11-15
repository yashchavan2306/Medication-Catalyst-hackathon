import React, { useState, useEffect } from 'react';
import type { Medication } from '../types/medication.js';
import { useAuth } from '../context/AuthContext.js';
import { X, AlertCircle } from 'lucide-react';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Medication> & { reason?: string }) => Promise<void>;
  initialData?: Medication | null;
}

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { member, circle } = useAuth();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [timesOfDayStr, setTimesOfDayStr] = useState('08:00');
  const [instructions, setInstructions] = useState('');
  const [purpose, setPurpose] = useState('');
  const [remainingQuantity, setRemainingQuantity] = useState('30');
  const [refillThreshold, setRefillThreshold] = useState('5');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isElder = member?.role === 'elder';

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDosage(initialData.dosage);
      setFrequency(initialData.frequency);
      setTimesOfDayStr(initialData.timesOfDay.join(', '));
      setInstructions(initialData.instructions || '');
      setPurpose(initialData.purpose || '');
      setRemainingQuantity(String(initialData.remainingQuantity));
      setRefillThreshold(String(initialData.refillThreshold));
      setReason('');
    } else {
      setName('');
      setDosage('');
      setFrequency('Once daily');
      setTimesOfDayStr('08:00');
      setInstructions('');
      setPurpose('');
      setRemainingQuantity('30');
      setRefillThreshold('5');
      setReason('');
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const times = timesOfDayStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const t of times) {
      if (!timeRegex.test(t)) {
        setErrorMsg(`Time "${t}" must be in 24-hour format HH:mm (e.g. 08:00, 20:00)`);
        return;
      }
    }

    if (times.length === 0) {
      setErrorMsg('Please specify at least one time of day.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        dosage,
        frequency,
        timesOfDay: times,
        instructions: instructions || undefined,
        purpose: purpose || undefined,
        remainingQuantity: parseInt(remainingQuantity, 10) || 30,
        refillThreshold: parseInt(refillThreshold, 10) || 5,
        reason: reason || undefined,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to save medication');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 id="medication-modal-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            {initialData ? 'Edit Medication' : 'Add Medication'}
          </h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            aria-label="Close modal"
            style={{ padding: '8px 12px', minHeight: '36px' }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Caretaker Workflow Notice */}
        {!isElder && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-warning-bg)',
              border: '2px solid var(--color-warning-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
            }}
          >
            <AlertCircle size={24} style={{ color: 'var(--color-warning)', flexShrink: 0 }} aria-hidden="true" />
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-warning)' }}>
              <strong>Elder Approval Required:</strong> As a caretaker, submitted medication changes will be sent to{' '}
              <strong>{circle?.elderName || 'the elder'}</strong> for review and approval before taking effect.
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="med-name">Medication Name *</label>
            <input
              id="med-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lisinopril, Metformin"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="med-dosage">Dosage *</label>
              <input
                id="med-dosage"
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 10mg, 500mg"
              />
            </div>
            <div>
              <label htmlFor="med-frequency">Frequency *</label>
              <input
                id="med-frequency"
                type="text"
                required
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g. Once daily, Twice daily"
              />
            </div>
          </div>

          <div>
            <label htmlFor="med-times">Times of Day (24-hour HH:mm format, comma-separated) *</label>
            <input
              id="med-times"
              type="text"
              required
              value={timesOfDayStr}
              onChange={(e) => setTimesOfDayStr(e.target.value)}
              placeholder="08:00, 20:00"
              aria-describedby="med-times-hint"
            />
            <div id="med-times-hint" className="input-hint">
              Example: "08:00" for morning, or "08:00, 19:00" for morning & evening.
            </div>
          </div>

          <div>
            <label htmlFor="med-purpose">Purpose / Condition</label>
            <input
              id="med-purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Blood pressure, Cholesterol"
            />
          </div>

          <div>
            <label htmlFor="med-instructions">Special Instructions</label>
            <input
              id="med-instructions"
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Take with a glass of water after breakfast"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="med-qty">Remaining Doses</label>
              <input
                id="med-qty"
                type="number"
                min="0"
                value={remainingQuantity}
                onChange={(e) => setRemainingQuantity(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="med-threshold">Refill Alert Threshold</label>
              <input
                id="med-threshold"
                type="number"
                min="0"
                value={refillThreshold}
                onChange={(e) => setRefillThreshold(e.target.value)}
              />
            </div>
          </div>

          {!isElder && (
            <div>
              <label htmlFor="med-reason">Reason for Change (Sent to Elder)</label>
              <input
                id="med-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Recommended by doctor at cardiology visit"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isElder ? 'Save Medication' : 'Submit for Elder Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

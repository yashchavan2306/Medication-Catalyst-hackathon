import React, { useState } from 'react';
import type { VitalLog } from '../types/common.js';
import { X } from 'lucide-react';

interface VitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<VitalLog>) => Promise<void>;
}

export const VitalModal: React.FC<VitalModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [mood, setMood] = useState<'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'UNWELL'>('GOOD');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    setIsSubmitting(true);
    try {
      await onSubmit({
        bloodPressureSystolic: systolic ? parseInt(systolic, 10) : undefined,
        bloodPressureDiastolic: diastolic ? parseInt(diastolic, 10) : undefined,
        bloodSugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
        heartRate: heartRate ? parseInt(heartRate, 10) : undefined,
        mood,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to record vitals');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const moods: Array<{ value: 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'UNWELL'; label: string }> = [
    { value: 'GREAT', label: 'Great' },
    { value: 'GOOD', label: 'Good' },
    { value: 'OKAY', label: 'Okay' },
    { value: 'TIRED', label: 'Tired' },
    { value: 'UNWELL', label: 'Unwell' },
  ];

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vital-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 id="vital-modal-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Daily Health Check-in
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
          {/* Mood selection */}
          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: '8px' }}>How are you feeling right now?</legend>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {moods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={mood === m.value ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setMood(m.value)}
                  style={{ flex: 1, minWidth: '90px' }}
                  aria-pressed={mood === m.value}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Blood pressure */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="vital-systolic">Blood Pressure (Systolic)</label>
              <input
                id="vital-systolic"
                type="number"
                min="60"
                max="250"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <label htmlFor="vital-diastolic">Blood Pressure (Diastolic)</label>
              <input
                id="vital-diastolic"
                type="number"
                min="40"
                max="150"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="e.g. 80"
              />
            </div>
          </div>

          {/* Blood sugar & Heart rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="vital-sugar">Blood Sugar (mg/dL)</label>
              <input
                id="vital-sugar"
                type="number"
                step="0.1"
                min="30"
                max="600"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                placeholder="e.g. 95.0"
              />
            </div>
            <div>
              <label htmlFor="vital-pulse">Heart Rate (BPM)</label>
              <input
                id="vital-pulse"
                type="number"
                min="40"
                max="220"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="e.g. 72"
              />
            </div>
          </div>

          <div>
            <label htmlFor="vital-notes">Notes / Observations</label>
            <input
              id="vital-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Took reading after 20-min rest"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Health Check-in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

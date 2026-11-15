import React, { useState, useEffect } from 'react';
import type { Appointment } from '../types/common.js';
import { X } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Appointment>) => Promise<void>;
  initialData?: Appointment | null;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDoctorName(initialData.doctorName);
      setLocation(initialData.location);
      // Format to datetime-local string
      const d = new Date(initialData.dateTime);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDateTime(localIso);
      setNotes(initialData.notes || '');
    } else {
      setTitle('');
      setDoctorName('');
      setLocation('');
      // Default to tomorrow 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDateTime(localIso);
      setNotes('');
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!dateTime) {
      setErrorMsg('Please select appointment date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        doctorName,
        location,
        dateTime: new Date(dateTime).toISOString(),
        notes: notes || undefined,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to save appointment');
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
      aria-labelledby="appointment-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 id="appointment-modal-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            {initialData ? 'Edit Appointment' : 'Schedule Appointment'}
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
          <div>
            <label htmlFor="appt-title">Appointment / Visit Title *</label>
            <input
              id="appt-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Cardiology Checkup, Physical Therapy"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="appt-doctor">Doctor / Specialist *</label>
              <input
                id="appt-doctor"
                type="text"
                required
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Adams"
              />
            </div>
            <div>
              <label htmlFor="appt-datetime">Date & Time *</label>
              <input
                id="appt-datetime"
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="appt-location">Clinic / Office Location *</label>
            <input
              id="appt-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Metro Health Pavilion, Suite 410"
            />
          </div>

          <div>
            <label htmlFor="appt-notes">Notes or Preparation</label>
            <textarea
              id="appt-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fasting required for 8 hours prior. Bring current medication list."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

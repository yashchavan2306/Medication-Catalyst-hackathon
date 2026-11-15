import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { FormField } from '../components/FormField.js';
import { StatusPill } from '../components/StatusPill.js';
import {
  getAppointmentsApi,
  createAppointmentApi,
  updateAppointmentApi,
  deleteAppointmentApi,
} from '../api/commonApi.js';
import type { Appointment } from '../types/common.js';
import {
  Calendar,
  Plus,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export const AppointmentsPage: React.FC = () => {
  const { member } = useAuth();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filterStatus, setFilterStatus] = useState<'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('UPCOMING');
  const [isLoading, setIsLoading] = useState(true);

  // Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);

  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [location, setLocation] = useState('');
  const [dateTimeStr, setDateTimeStr] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isFamily = member?.role === 'family';

  const loadAppointments = useCallback(async () => {
    try {
      const data = await getAppointmentsApi(filterStatus);
      setAppointments(data);
    } catch {
      showToast('Could not load appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, showToast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const openAddModal = () => {
    setEditingApp(null);
    setTitle('');
    setDoctorName('');
    setLocation('');
    // Default to tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setDateTimeStr(tomorrow.toISOString().slice(0, 16));
    setNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (app: Appointment) => {
    setEditingApp(app);
    setTitle(app.title);
    setDoctorName(app.doctorName);
    setLocation(app.location);
    try {
      const d = new Date(app.dateTime);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setDateTimeStr(localISOTime);
    } catch {
      setDateTimeStr('');
    }
    setNotes(app.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const isoDateTime = new Date(dateTimeStr).toISOString();

      const payload = {
        title: title.trim(),
        doctorName: doctorName.trim(),
        location: location.trim(),
        dateTime: isoDateTime,
        notes: notes.trim() || undefined,
      };

      if (editingApp) {
        await updateAppointmentApi(editingApp.id, payload);
        showToast('Appointment updated successfully', 'success');
      } else {
        await createAppointmentApi(payload);
        showToast('Appointment created successfully', 'success');
      }

      setIsFormOpen(false);
      loadAppointments();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to save appointment');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (app: Appointment, newStatus: 'COMPLETED' | 'CANCELLED') => {
    try {
      await updateAppointmentApi(app.id, { status: newStatus });
      showToast(`Appointment marked as ${newStatus.toLowerCase()}`, 'success');
      loadAppointments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (app: Appointment) => {
    if (!window.confirm(`Are you sure you want to delete "${app.title}"?`)) return;

    try {
      await deleteAppointmentApi(app.id);
      showToast('Appointment removed', 'success');
      loadAppointments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete appointment';
      showToast(msg, 'error');
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
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Doctor Appointments</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Schedule and coordinate doctor consultations, checkups, and lab visits
          </p>
        </div>

        {/* Hide edit actions for family */}
        {!isFamily && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
            aria-label="Schedule a new appointment"
          >
            <Plus size={20} aria-hidden="true" />
            <span>Schedule Appointment</span>
          </button>
        )}
      </header>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(['UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn ${filterStatus === tab ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: '38px', padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
            onClick={() => setFilterStatus(tab)}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

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
          Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Calendar size={44} color="var(--color-text-muted)" aria-hidden="true" style={{ margin: '0 auto 12px auto' }} />
          <h2>No appointments found</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
            There are no appointments under the "{filterStatus.toLowerCase()}" filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {appointments.map((app) => {
            const dateObj = new Date(app.dateTime);
            const isUpcoming = app.status === 'UPCOMING';

            return (
              <article
                key={app.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderLeft: `6px solid ${
                    app.status === 'COMPLETED'
                      ? 'var(--color-success)'
                      : app.status === 'CANCELLED'
                        ? 'var(--color-danger)'
                        : 'var(--color-primary)'
                  }`,
                }}
                aria-labelledby={`app-title-${app.id}`}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h2 id={`app-title-${app.id}`} style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                      {app.title}
                    </h2>
                    <StatusPill status={app.status} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--font-size-base)', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <User size={18} color="var(--color-primary)" aria-hidden="true" />
                      <span>{app.doctorName}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                      <Clock size={18} aria-hidden="true" />
                      <span>
                        {dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                        {dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                      <MapPin size={18} aria-hidden="true" />
                      <span>{app.location}</span>
                    </div>

                    {app.notes && (
                      <p style={{ marginTop: '8px', fontSize: 'var(--font-size-sm)', fontStyle: 'italic', color: 'var(--color-text-light)' }}>
                        Notes: {app.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions (Hidden for Family) */}
                {!isFamily && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    {isUpcoming && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-success"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                          onClick={() => handleStatusChange(app, 'COMPLETED')}
                          aria-label={`Mark ${app.title} as completed`}
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                          <span>Complete</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                          onClick={() => handleStatusChange(app, 'CANCELLED')}
                          aria-label={`Cancel ${app.title}`}
                        >
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ minHeight: '36px', padding: '6px 10px' }}
                        onClick={() => openEditModal(app)}
                        aria-label={`Edit ${app.title}`}
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ minHeight: '36px', padding: '6px 10px' }}
                        onClick={() => handleDelete(app)}
                        aria-label={`Delete ${app.title}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Appointment Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="app-modal-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                {editingApp ? 'Edit Appointment' : 'Schedule Appointment'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="btn btn-secondary"
                style={{ minHeight: '36px', padding: '6px' }}
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontWeight: 600,
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <FormField id="app-title" label="Appointment Title" required hint="e.g. Cardiologist Checkup, Eye Exam">
                <input
                  id="app-title"
                  type="text"
                  required
                  placeholder="e.g. Annual Cardiology Follow-up"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormField>

              <FormField id="app-doc" label="Doctor / Specialist Name" required>
                <input
                  id="app-doc"
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Vance"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
              </FormField>

              <FormField id="app-loc" label="Clinic / Hospital Location" required>
                <input
                  id="app-loc"
                  type="text"
                  required
                  placeholder="e.g. Suite 400, Memorial Hospital"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </FormField>

              <FormField id="app-datetime" label="Date and Time" required>
                <input
                  id="app-datetime"
                  type="datetime-local"
                  required
                  value={dateTimeStr}
                  onChange={(e) => setDateTimeStr(e.target.value)}
                />
              </FormField>

              <FormField id="app-notes" label="Preparation Notes & Instructions">
                <textarea
                  id="app-notes"
                  rows={2}
                  placeholder="e.g. Fasting required for 8 hours prior; bring current medication list"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingApp ? 'Update Appointment' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

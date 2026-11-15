import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { FormField } from '../components/FormField.js';
import {
  getMedicationsApi,
  createMedicationApi,
  updateMedicationApi,
  deleteMedicationApi,
} from '../api/medicationsApi.js';
import type { Medication } from '../types/medication.js';
import {
  Pill,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Info,
  X,
} from 'lucide-react';

export const MedicationsPage: React.FC = () => {
  const { member } = useAuth();
  const { showToast } = useToast();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [detailMedication, setDetailMedication] = useState<Medication | null>(null);

  // Form inputs
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
  const [formError, setFormError] = useState<string | null>(null);

  const isFamily = member?.role === 'family';
  const isElder = member?.role === 'elder';

  const loadMedications = useCallback(async () => {
    try {
      const data = await getMedicationsApi(includeInactive);
      setMedications(data);
    } catch {
      showToast('Could not load medications', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, showToast]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const openAddModal = () => {
    setEditingMedication(null);
    setName('');
    setDosage('');
    setFrequency('Once daily');
    setTimesOfDayStr('08:00');
    setInstructions('');
    setPurpose('');
    setRemainingQuantity('30');
    setRefillThreshold('5');
    setReason('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMedication(med);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setTimesOfDayStr(med.timesOfDay.join(', '));
    setInstructions(med.instructions || '');
    setPurpose(med.purpose || '');
    setRemainingQuantity(String(med.remainingQuantity));
    setRefillThreshold(String(med.refillThreshold));
    setReason('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      // Parse comma-separated or space-separated HH:mm times
      const times = timesOfDayStr
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));

      if (times.length === 0) {
        setFormError('Please enter at least one valid scheduled time in 24-hour HH:mm format (e.g. 08:00, 20:00).');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        timesOfDay: times,
        instructions: instructions.trim() || undefined,
        purpose: purpose.trim() || undefined,
        remainingQuantity: parseInt(remainingQuantity, 10) || 0,
        refillThreshold: parseInt(refillThreshold, 10) || 5,
        reason: reason.trim() || undefined,
      };

      if (editingMedication) {
        const res = await updateMedicationApi(editingMedication.id, payload);
        if (res.status === 'PENDING_APPROVAL') {
          showToast('Update request submitted for elder approval', 'info');
        } else {
          showToast('Medication updated successfully', 'success');
        }
      } else {
        const res = await createMedicationApi(payload);
        if (res.status === 'PENDING_APPROVAL') {
          showToast('New medication submitted for elder approval', 'info');
        } else {
          showToast('Medication created successfully', 'success');
        }
      }

      setIsFormOpen(false);
      loadMedications();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to save medication');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (med: Medication) => {
    if (!window.confirm(`Are you sure you want to remove or deactivate "${med.name}"?`)) {
      return;
    }

    try {
      const res = await deleteMedicationApi(med.id);
      if (res.status === 'PENDING_APPROVAL') {
        showToast('Deactivation request sent to elder for approval', 'info');
      } else {
        showToast(`Medication "${med.name}" deactivated`, 'success');
      }
      loadMedications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete medication';
      showToast(msg, 'error');
    }
  };

  const filteredMeds = medications.filter((m) => {
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.purpose && m.purpose.toLowerCase().includes(q));
  });

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Page Header */}
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
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Medications</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Manage daily prescriptions, dosages, and refill quantities
          </p>
        </div>

        {/* Hide edit actions for family */}
        {!isFamily && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
            aria-label="Add a new medication"
          >
            <Plus size={20} aria-hidden="true" />
            <span>Add Medication</span>
          </button>
        )}
      </header>

      {/* Search and Inactive Toggle Controls */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={20} color="var(--color-text-muted)" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by medication name or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none' }}
            aria-label="Search medications"
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            style={{ width: '20px', height: '20px', minHeight: 'unset' }}
          />
          <span>Include Inactive / Discontinued</span>
        </label>
      </div>

      {/* Loading state */}
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
          Loading medications...
        </div>
      ) : filteredMeds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Pill size={40} color="var(--color-text-muted)" aria-hidden="true" style={{ margin: '0 auto 12px auto' }} />
          <h3>No medications found</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {searchQuery ? 'Try a different search query.' : 'No active medications in this care circle.'}
          </p>
        </div>
      ) : (
        /* Medications Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredMeds.map((med) => {
            const isLowRefill = med.remainingQuantity <= med.refillThreshold;

            return (
              <article
                key={med.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: med.isActive ? 1 : 0.65,
                  borderLeft: isLowRefill
                    ? '6px solid var(--color-warning)'
                    : med.hasPendingChange
                      ? '6px solid var(--color-primary)'
                      : '6px solid var(--color-border-strong)',
                }}
                aria-labelledby={`med-name-${med.id}`}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h2 id={`med-name-${med.id}`} style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                      {med.name}
                    </h2>
                    {!med.isActive && <span className="badge badge-neutral">Inactive</span>}
                  </div>

                  <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {med.dosage} &bull; {med.frequency}
                  </p>

                  {med.purpose && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Purpose: <strong>{med.purpose}</strong>
                    </p>
                  )}

                  {/* Scheduled times */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <Clock size={16} color="var(--color-text-muted)" aria-hidden="true" />
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Times:</span>
                    {med.timesOfDay.map((t) => (
                      <span
                        key={t}
                        style={{
                          backgroundColor: 'var(--color-primary-surface)',
                          color: 'var(--color-primary-active)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 700,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Stock and Refill Alert */}
                  <div style={{ marginTop: '14px', fontSize: 'var(--font-size-sm)' }}>
                    {isLowRefill ? (
                      <span
                        className="badge badge-warning"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span>Low Stock: {med.remainingQuantity} remaining (Refill threshold: {med.refillThreshold})</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        Stock: <strong>{med.remainingQuantity}</strong> doses remaining
                      </span>
                    )}
                  </div>

                  {/* Pending change tag */}
                  {med.hasPendingChange && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '6px 10px',
                        backgroundColor: 'var(--color-primary-surface)',
                        color: 'var(--color-primary-active)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 600,
                      }}
                    >
                      Pending Elder Approval ({med.pendingChange?.changeType})
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    onClick={() => setDetailMedication(med)}
                    aria-label={`View details for ${med.name}`}
                  >
                    <Info size={16} aria-hidden="true" />
                    <span>Details</span>
                  </button>

                  {/* Hide edit actions for family */}
                  {!isFamily && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        onClick={() => openEditModal(med)}
                        aria-label={`Edit ${med.name}`}
                      >
                        <Edit2 size={16} aria-hidden="true" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ minHeight: '36px', padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        onClick={() => handleDelete(med)}
                        aria-label={`Deactivate ${med.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Medication Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="form-modal-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                {editingMedication ? `Edit Medication: ${editingMedication.name}` : 'Add New Medication'}
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

            {/* Approval Notice */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: isElder ? 'var(--color-success-bg)' : 'var(--color-primary-surface)',
                border: `1px solid ${isElder ? 'var(--color-success-border)' : 'var(--color-primary)'}`,
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
              }}
            >
              {isElder
                ? 'Elder Authority: Your medication adjustments take effect immediately.'
                : 'Caretaker Notice: This modification will be submitted to the Elder for review and approval.'}
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
              <FormField id="med-name" label="Medication Name" required>
                <input
                  id="med-name"
                  type="text"
                  required
                  placeholder="e.g. Lisinopril, Metformin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField id="med-dosage" label="Dosage" required hint="e.g. 10mg, 500mg, 1 tablet">
                  <input
                    id="med-dosage"
                    type="text"
                    required
                    placeholder="e.g. 10mg"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </FormField>

                <FormField id="med-frequency" label="Frequency" required hint="e.g. Once daily">
                  <input
                    id="med-frequency"
                    type="text"
                    required
                    placeholder="e.g. Once daily, Twice daily"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField
                id="med-times"
                label="Scheduled Times (24-hour HH:mm)"
                required
                hint="Comma-separated, e.g. 08:00, 20:00"
              >
                <input
                  id="med-times"
                  type="text"
                  required
                  placeholder="08:00, 20:00"
                  value={timesOfDayStr}
                  onChange={(e) => setTimesOfDayStr(e.target.value)}
                />
              </FormField>

              <FormField id="med-purpose" label="Purpose / Indication" hint="e.g. High blood pressure, Diabetes">
                <input
                  id="med-purpose"
                  type="text"
                  placeholder="e.g. Blood pressure"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </FormField>

              <FormField id="med-instructions" label="Instructions" hint="e.g. Take with a glass of water after meals">
                <input
                  id="med-instructions"
                  type="text"
                  placeholder="e.g. Take with food"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField id="med-qty" label="Remaining Quantity" hint="Current pill count">
                  <input
                    id="med-qty"
                    type="number"
                    min={0}
                    value={remainingQuantity}
                    onChange={(e) => setRemainingQuantity(e.target.value)}
                  />
                </FormField>

                <FormField id="med-threshold" label="Refill Alert Threshold" hint="Alert when count falls below">
                  <input
                    id="med-threshold"
                    type="number"
                    min={0}
                    value={refillThreshold}
                    onChange={(e) => setRefillThreshold(e.target.value)}
                  />
                </FormField>
              </div>

              {!isElder && (
                <FormField id="med-reason" label="Reason for this Request" hint="Explanation for the elder">
                  <textarea
                    id="med-reason"
                    rows={2}
                    placeholder="e.g. Prescribed by Dr. Vance at yesterday's visit"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </FormField>
              )}

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
                  {isSubmitting
                    ? 'Saving...'
                    : isElder
                      ? 'Save Medication'
                      : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medication Detail Modal */}
      {detailMedication && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="detail-modal-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                {detailMedication.name} ({detailMedication.dosage})
              </h2>
              <button
                type="button"
                onClick={() => setDetailMedication(null)}
                className="btn btn-secondary"
                style={{ minHeight: '36px', padding: '6px' }}
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: 'var(--font-size-base)' }}>
              <div>
                <strong>Frequency:</strong> {detailMedication.frequency}
              </div>
              <div>
                <strong>Scheduled Times:</strong> {detailMedication.timesOfDay.join(', ')}
              </div>
              <div>
                <strong>Purpose:</strong> {detailMedication.purpose || 'None specified'}
              </div>
              <div>
                <strong>Instructions:</strong> {detailMedication.instructions || 'Standard administration'}
              </div>
              <div>
                <strong>Current Stock:</strong> {detailMedication.remainingQuantity} remaining (Refill threshold: {detailMedication.refillThreshold})
              </div>
              <div>
                <strong>Status:</strong> {detailMedication.isActive ? 'Active Prescription' : 'Inactive / Discontinued'}
              </div>
              {detailMedication.createdByName && (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  Created by: {detailMedication.createdByName} ({detailMedication.createdByRole})
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDetailMedication(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

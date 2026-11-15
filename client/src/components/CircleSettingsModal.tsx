import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { updateCircleApi, updatePasscodesApi } from '../api/commonApi.js';
import { useToast } from '../context/ToastContext.js';
import { X, KeyRound, PhoneCall, Copy, Check } from 'lucide-react';

interface CircleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CircleSettingsModal: React.FC<CircleSettingsModalProps> = ({ isOpen, onClose }) => {
  const { circle, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [emergencyName, setEmergencyName] = useState(circle?.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(circle?.emergencyContactPhone || '');
  const [notes, setNotes] = useState(circle?.notes || '');

  const [elderPass, setElderPass] = useState('');
  const [carePass, setCarePass] = useState('');
  const [famPass, setFamPass] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    if (!circle?.code) return;
    await navigator.clipboard.writeText(circle.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast('Circle code copied to clipboard!', 'info');
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCircleApi({
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        notes,
      });

      if (elderPass || carePass || famPass) {
        await updatePasscodesApi({
          elderPasscode: elderPass || undefined,
          caretakerPasscode: carePass || undefined,
          familyPasscode: famPass || undefined,
        });
      }

      await refreshProfile();
      showToast('Circle settings updated successfully', 'success');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('Failed to update circle settings', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="circle-settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 id="circle-settings-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Circle Settings & Access
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

        {/* Circle code display with one-click copy */}
        <div
          style={{
            backgroundColor: 'var(--color-primary-surface)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '2px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Circle Access Code</div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
              {circle?.code}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyCode}
            aria-label="Copy circle code"
          >
            {copiedCode ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <form onSubmit={handleSaveDetails} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={20} aria-hidden="true" />
            <span>Emergency Contact</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="settings-contact-name">Contact Name</label>
              <input
                id="settings-contact-name"
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. Dr. Vance, Maria"
              />
            </div>
            <div>
              <label htmlFor="settings-contact-phone">Contact Phone</label>
              <input
                id="settings-contact-phone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="e.g. +1-555-0199"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-notes">Important Circle Notes</label>
            <textarea
              id="settings-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Allergies: Penicillin. Prefers morning appointments."
            />
          </div>

          {/* Passcodes Management */}
          <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <KeyRound size={20} aria-hidden="true" />
              <span>Update Role Passcodes (leave blank to keep current)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="settings-pass-elder">Elder Passcode</label>
                <input
                  id="settings-pass-elder"
                  type="password"
                  value={elderPass}
                  onChange={(e) => setElderPass(e.target.value)}
                  placeholder="New Elder passcode"
                />
              </div>

              <div>
                <label htmlFor="settings-pass-care">Caretaker Passcode</label>
                <input
                  id="settings-pass-care"
                  type="password"
                  value={carePass}
                  onChange={(e) => setCarePass(e.target.value)}
                  placeholder="New Caretaker passcode"
                />
              </div>

              <div>
                <label htmlFor="settings-pass-fam">Family Passcode</label>
                <input
                  id="settings-pass-fam"
                  type="password"
                  value={famPass}
                  onChange={(e) => setFamPass(e.target.value)}
                  placeholder="New Family passcode"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { FormField } from '../components/FormField.js';
import {
  Heart,
  ArrowLeft,
  Shield,
  Users,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { CreateCircleResult } from '../types/auth.js';

export const CreateCirclePage: React.FC = () => {
  const { createCircle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [elderName, setElderName] = useState('');
  const [elderEmail, setElderEmail] = useState('');
  const [elderPasscode, setElderPasscode] = useState('');
  const [caretakerPasscode, setCaretakerPasscode] = useState('');
  const [familyPasscode, setFamilyPasscode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state: show passcodes once with copy button
  const [createdResult, setCreatedResult] = useState<CreateCircleResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await createCircle({
        name: name.trim() || undefined,
        elderName: elderName.trim(),
        elderEmail: elderEmail.trim() || undefined,
        elderPasscode: elderPasscode.trim() || undefined,
        caretakerPasscode: caretakerPasscode.trim() || undefined,
        familyPasscode: familyPasscode.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setCreatedResult(result);
      showToast('Care Circle created successfully! Please save your passcodes.', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to create Care Circle');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`${label} copied to clipboard!`, 'info');
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      showToast(`Could not copy ${label}`, 'error');
    }
  };

  const copyAllCredentials = async () => {
    if (!createdResult) return;
    const text = [
      `CareCircle Access Details:`,
      `Circle Code: ${createdResult.circleCode}`,
      `Elder Passcode: ${createdResult.passcodes.elder}`,
      `Caretaker Passcode: ${createdResult.passcodes.caretaker}`,
      `Family Passcode: ${createdResult.passcodes.family}`,
    ].join('\n');

    await copyToClipboard(text, 'All credentials', 'ALL');
  };

  const handleProceed = () => {
    if (!createdResult) return;
    const target = createdResult.member.role === 'elder' ? '/today' : '/dashboard';
    navigate(target);
  };

  if (createdResult) {
    return (
      <main className="container" role="main" style={{ maxWidth: '680px', margin: '40px auto' }}>
        <section
          className="card"
          aria-labelledby="success-heading"
          style={{ padding: '36px', borderColor: 'var(--color-success-border)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: '16px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                marginBottom: '12px',
              }}
            >
              <Check size={40} aria-hidden="true" />
            </div>
            <h1 id="success-heading" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
              Care Circle Created!
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)', marginTop: '6px' }}>
              Save these passcodes now. They are only shown once for security.
            </p>
          </div>

          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              border: '2px solid var(--color-warning-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '28px',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={24} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Important Security Notice:</strong> Passcodes are hashed and will not be displayed again.
              Please copy or record them before continuing.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {/* Circle Code */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: 'var(--color-primary-surface)',
                border: '2px solid var(--color-primary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary-active)' }}>
                  CIRCLE CODE (Shared by all members)
                </span>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary-active)', letterSpacing: '1px' }}>
                  {createdResult.circleCode}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyToClipboard(createdResult.circleCode, 'Circle Code', 'CODE')}
                aria-label="Copy Circle Code"
              >
                {copiedKey === 'CODE' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span>{copiedKey === 'CODE' ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Elder Passcode */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Elder Passcode (Full Authority)
                </span>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {createdResult.passcodes.elder}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyToClipboard(createdResult.passcodes.elder, 'Elder Passcode', 'ELDER')}
                aria-label="Copy Elder Passcode"
              >
                {copiedKey === 'ELDER' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span>{copiedKey === 'ELDER' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Caretaker Passcode */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Caretaker Passcode (Propose Changes & Log Doses)
                </span>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {createdResult.passcodes.caretaker}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyToClipboard(createdResult.passcodes.caretaker, 'Caretaker Passcode', 'CARETAKER')}
                aria-label="Copy Caretaker Passcode"
              >
                {copiedKey === 'CARETAKER' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span>{copiedKey === 'CARETAKER' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Family Passcode */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Family Passcode (Read-Only Updates)
                </span>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {createdResult.passcodes.family}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyToClipboard(createdResult.passcodes.family, 'Family Passcode', 'FAMILY')}
                aria-label="Copy Family Passcode"
              >
                {copiedKey === 'FAMILY' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span>{copiedKey === 'FAMILY' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyAllCredentials}
              style={{ flex: 1 }}
            >
              {copiedKey === 'ALL' ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
              <span>{copiedKey === 'ALL' ? 'All Copied!' : 'Copy All Credentials'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleProceed}
              style={{ flex: 1 }}
            >
              <span>Proceed to Circle</span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container" role="main" style={{ maxWidth: '680px', margin: '40px auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/login" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Back to Login</span>
        </Link>
      </div>

      <section className="card" aria-labelledby="create-circle-heading" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Heart size={36} fill="var(--color-primary)" color="var(--color-primary)" aria-hidden="true" />
          <h1 id="create-circle-heading" style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
            Create a Care Circle
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Set up a care circle with access passcodes for the elder, caretakers, and family members.
        </p>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField id="circle-name" label="Circle Name" hint="Optional, e.g. Eleanor's Circle">
            <input
              id="circle-name"
              type="text"
              placeholder="e.g. Eleanor's Circle"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField id="elder-name" label="Elder's Full Name" required hint="The senior receiving care">
            <input
              id="elder-name"
              type="text"
              required
              placeholder="e.g. Eleanor Vance"
              value={elderName}
              onChange={(e) => setElderName(e.target.value)}
            />
          </FormField>

          <FormField id="elder-email" label="Elder's Email" hint="Optional, for notifications">
            <input
              id="elder-email"
              type="email"
              placeholder="e.g. eleanor@example.com"
              value={elderEmail}
              onChange={(e) => setElderEmail(e.target.value)}
            />
          </FormField>

          {/* Passcodes fieldset */}
          <fieldset
            style={{
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <legend style={{ fontWeight: 800, padding: '0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} aria-hidden="true" />
              <span>Role Passcodes (Leave blank to auto-generate)</span>
            </legend>

            <FormField id="elder-passcode" label="Elder Passcode" hint="Min 4 characters (or leave empty)">
              <input
                id="elder-passcode"
                type="text"
                placeholder="Auto-generated if left blank"
                value={elderPasscode}
                onChange={(e) => setElderPasscode(e.target.value)}
              />
            </FormField>

            <FormField id="caretaker-passcode" label="Caretaker Passcode" hint="Min 4 characters (or leave empty)">
              <input
                id="caretaker-passcode"
                type="text"
                placeholder="Auto-generated if left blank"
                value={caretakerPasscode}
                onChange={(e) => setCaretakerPasscode(e.target.value)}
              />
            </FormField>

            <FormField id="family-passcode" label="Family Passcode" hint="Min 4 characters (or leave empty)">
              <input
                id="family-passcode"
                type="text"
                placeholder="Auto-generated if left blank"
                value={familyPasscode}
                onChange={(e) => setFamilyPasscode(e.target.value)}
              />
            </FormField>
          </fieldset>

          {/* Emergency contacts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <FormField id="emg-name" label="Emergency Contact Name">
              <input
                id="emg-name"
                type="text"
                placeholder="e.g. Dr. Robert Vance"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </FormField>

            <FormField id="emg-phone" label="Emergency Contact Phone">
              <input
                id="emg-phone"
                type="tel"
                placeholder="e.g. +1-555-0199"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </FormField>
          </div>

          <FormField id="circle-notes" label="Initial Medical & Care Notes">
            <textarea
              id="circle-notes"
              rows={3}
              placeholder="e.g. Allergies, blood type, mobility notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '12px' }}
          >
            <Users size={20} aria-hidden="true" />
            <span>{isLoading ? 'Creating Care Circle...' : 'Create Care Circle & Generate Passcodes'}</span>
          </button>
        </form>
      </section>
    </main>
  );
};

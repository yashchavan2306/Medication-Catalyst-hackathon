import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Heart, ArrowLeft, Shield, Users } from 'lucide-react';

export const CreateCirclePage: React.FC = () => {
  const { createCircle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [elderName, setElderName] = useState('');
  const [elderPasscode, setElderPasscode] = useState('');
  const [caretakerPasscode, setCaretakerPasscode] = useState('');
  const [familyPasscode, setFamilyPasscode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await createCircle({
        name,
        elderName,
        elderPasscode,
        caretakerPasscode,
        familyPasscode,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        notes: notes || undefined,
      });
      navigate('/');
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
          Set up a unified circle with passcodes for the elder, caretakers, and family members.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="circle-name">Circle Name *</label>
            <input
              id="circle-name"
              type="text"
              required
              placeholder="e.g. Grandma Eleanor's Circle"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="elder-name">Elder / Senior's Full Name *</label>
            <input
              id="elder-name"
              type="text"
              required
              placeholder="e.g. Eleanor Vance"
              value={elderName}
              onChange={(e) => setElderName(e.target.value)}
            />
          </div>

          {/* Role Passcodes Section */}
          <fieldset
            style={{
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <legend style={{ fontWeight: 800, padding: '0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} aria-hidden="true" />
              <span>Role Access Passcodes</span>
            </legend>

            <div>
              <label htmlFor="elder-passcode">Elder Passcode (Full Owner Access) *</label>
              <input
                id="elder-passcode"
                type="password"
                required
                minLength={4}
                placeholder="Passcode used by elder to approve changes"
                value={elderPasscode}
                onChange={(e) => setElderPasscode(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="caretaker-passcode">Caretaker Passcode (Add/Edit with Approval) *</label>
              <input
                id="caretaker-passcode"
                type="password"
                required
                minLength={4}
                placeholder="Passcode for nurses and caretakers"
                value={caretakerPasscode}
                onChange={(e) => setCaretakerPasscode(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="family-passcode">Family Passcode (Read-Only Updates) *</label>
              <input
                id="family-passcode"
                type="password"
                required
                minLength={4}
                placeholder="Passcode for family observers"
                value={familyPasscode}
                onChange={(e) => setFamilyPasscode(e.target.value)}
              />
            </div>
          </fieldset>

          {/* Emergency contacts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="emg-name">Emergency Contact Name</label>
              <input
                id="emg-name"
                type="text"
                placeholder="e.g. Dr. Robert Vance"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="emg-phone">Emergency Contact Phone</label>
              <input
                id="emg-phone"
                type="tel"
                placeholder="e.g. +1-555-0199"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="circle-notes">Initial Care Notes</label>
            <textarea
              id="circle-notes"
              rows={2}
              placeholder="e.g. Allergies, special mobility or dietary instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ marginTop: '10px' }}
          >
            <Users size={20} aria-hidden="true" />
            <span>{isLoading ? 'Creating Care Circle...' : 'Create Care Circle'}</span>
          </button>
        </form>
      </section>
    </main>
  );
};

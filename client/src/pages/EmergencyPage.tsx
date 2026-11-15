import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { getEmergencyInfoApi } from '../api/commonApi.js';
import type { EmergencyInfoResponse } from '../types/common.js';
import {
  Printer,
  Heart,
  PhoneCall,
  Pill,
  AlertTriangle,
} from 'lucide-react';

export const EmergencyPage: React.FC = () => {
  const { showToast } = useToast();
  const [emergencyData, setEmergencyData] = useState<EmergencyInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getEmergencyInfoApi();
      setEmergencyData(data);
    } catch {
      showToast('Could not load emergency information', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: 'var(--font-size-2xl)',
        }}
      >
        Loading emergency medical card...
      </div>
    );
  }

  if (!emergencyData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Emergency Information Unavailable</h2>
      </div>
    );
  }

  const {
    elderName,
    circleCode,
    emergencyContactName,
    emergencyContactPhone,
    medicalNotes,
    activeMedications,
    nextAppointment,
  } = emergencyData;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Banner with Print Button (Hidden on Print) */}
      <div
        className="no-print"
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
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Emergency Medical Card</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Quick reference sheet for first responders, hospital visits, or wallet emergency cards
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-primary"
          style={{ fontSize: 'var(--font-size-lg)', padding: '12px 24px' }}
          aria-label="Print this emergency card"
        >
          <Printer size={22} aria-hidden="true" />
          <span>Print Emergency Card</span>
        </button>
      </div>

      {/* The Printable Emergency Card */}
      <section
        className="card"
        style={{
          padding: '36px',
          borderRadius: 'var(--radius-lg)',
          border: '3px solid var(--color-danger)',
          boxShadow: 'var(--shadow-md)',
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
        aria-labelledby="emergency-card-title"
      >
        {/* Emergency Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid var(--color-danger)',
            paddingBottom: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Heart size={36} fill="var(--color-danger)" color="var(--color-danger)" aria-hidden="true" />
            <div>
              <h2 id="emergency-card-title" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-danger)', margin: 0, lineHeight: 1.2 }}>
                EMERGENCY MEDICAL PROFILE
              </h2>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                CareCircle Critical Health Information
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>CIRCLE CODE</span>
            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1px' }}>{circleCode}</div>
          </div>
        </div>

        {/* Primary Patient Info & Contact Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Elder Name */}
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Patient / Elder Name
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>
              {elderName}
            </div>
          </div>

          {/* Emergency Contact */}
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '2px solid #ef4444' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
              Primary Emergency Contact
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', color: '#991b1b' }}>
              {emergencyContactName || 'None listed'}
            </div>
            {emergencyContactPhone && (
              <a
                href={`tel:${emergencyContactPhone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#991b1b',
                  marginTop: '4px',
                  textDecoration: 'none',
                }}
              >
                <PhoneCall size={16} aria-hidden="true" />
                <span>{emergencyContactPhone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Medical Notes / Allergies */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#92400e', marginBottom: '6px' }}>
            <AlertTriangle size={20} aria-hidden="true" />
            <span>CRITICAL MEDICAL NOTES, ALLERGIES &amp; CONDITIONS</span>
          </div>
          <div style={{ fontSize: '17px', color: '#1e293b', lineHeight: 1.5 }}>
            {medicalNotes || 'No specific allergies or conditions recorded.'}
          </div>
        </div>

        {/* Active Medications List */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Pill size={22} color="var(--color-primary)" aria-hidden="true" />
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Current Active Prescriptions</h3>
          </div>

          {activeMedications.length === 0 ? (
            <p style={{ color: '#64748b' }}>No active prescriptions listed.</p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '16px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Medication</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Dosage</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Frequency</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {activeMedications.map((med) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800 }}>{med.name}</td>
                    <td style={{ padding: '10px 12px' }}>{med.dosage}</td>
                    <td style={{ padding: '10px 12px' }}>{med.frequency}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {med.instructions || med.purpose || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Next Appointment Reference */}
        {nextAppointment && (
          <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '16px', fontSize: '15px' }}>
            <span style={{ fontWeight: 700, color: '#475569' }}>Primary Attending Physician / Next Visit: </span>
            <strong>{nextAppointment.doctorName}</strong> &bull; {nextAppointment.location} &bull;{' '}
            {new Date(nextAppointment.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}

        {/* Card Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <span>CareCircle Emergency Protocol &bull; Keep this card accessible</span>
          <span>Printed: {new Date().toLocaleDateString()}</span>
        </div>
      </section>
    </div>
  );
};

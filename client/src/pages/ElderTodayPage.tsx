import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { StatusPill } from '../components/StatusPill.js';
import {
  getTodayDosesApi,
  takeDoseApi,
  skipDoseApi,
  snoozeDoseApi,
} from '../api/medicationsApi.js';
import { getAppointmentsApi } from '../api/commonApi.js';
import type { TodayDose, TodayDosesResponse } from '../types/medication.js';
import type { Appointment } from '../types/common.js';
import {
  CheckCircle2,
  Volume2,
  VolumeX,
  Flame,
  Calendar,
  X,
  BellRing,
} from 'lucide-react';

export const ElderTodayPage: React.FC = () => {
  const { member } = useAuth();
  const { showToast } = useToast();

  const [todayData, setTodayData] = useState<TodayDosesResponse | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [skipModalDose, setSkipModalDose] = useState<TodayDose | null>(null);
  const [skipReason, setSkipReason] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<string>('');

  const isFamily = member?.role === 'family';

  const loadData = useCallback(async () => {
    try {
      const [schedule, appointments] = await Promise.all([
        getTodayDosesApi(),
        getAppointmentsApi('UPCOMING').catch(() => []),
      ]);
      setTodayData(schedule);
      if (appointments && appointments.length > 0) {
        setNextAppointment(appointments[0]);
      } else {
        setNextAppointment(null);
      }
    } catch {
      showToast('Could not load today\'s doses', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Clean up Web Speech when leaving
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTakeDose = async (dose: TodayDose) => {
    try {
      const res = await takeDoseApi(dose.id);
      showToast(`Great job! ${dose.medication.name} marked as taken.`, 'success');
      setActionFeedback(`Marked ${dose.medication.name} as taken.`);
      setTodayData((prev) => {
        if (!prev) return prev;
        const updatedDoses = prev.doses.map((d) => (d.id === dose.id ? res.dose : d));
        const takenCount = updatedDoses.filter((d) => d.status === 'TAKEN').length;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            takenCount,
            pendingCount: Math.max(0, prev.summary.pendingCount - 1),
            adherencePercentage: Math.round((takenCount / prev.doses.length) * 100),
          },
          doses: updatedDoses,
        };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record dose';
      showToast(msg, 'error');
    }
  };

  const handleConfirmSkip = async () => {
    if (!skipModalDose) return;
    try {
      const res = await skipDoseApi(skipModalDose.id, skipReason || 'Skipped by elder');
      showToast(`${skipModalDose.medication.name} skipped.`, 'warning');
      setActionFeedback(`Skipped ${skipModalDose.medication.name}.`);
      setTodayData((prev) => {
        if (!prev) return prev;
        const updatedDoses = prev.doses.map((d) => (d.id === skipModalDose.id ? res.dose : d));
        return {
          ...prev,
          doses: updatedDoses,
        };
      });
      setSkipModalDose(null);
      setSkipReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to skip dose';
      showToast(msg, 'error');
    }
  };

  const handleSnooze = async (dose: TodayDose) => {
    try {
      const res = await snoozeDoseApi(dose.id, 30);
      showToast(`${dose.medication.name} snoozed for 30 minutes.`, 'info');
      setActionFeedback(`Snoozed ${dose.medication.name} for 30 minutes.`);
      setTodayData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          doses: prev.doses.map((d) => (d.id === dose.id ? res.dose : d)),
        };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to snooze dose';
      showToast(msg, 'error');
    }
  };

  // Web Speech Read-Aloud
  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this device/browser', 'warning');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!todayData || todayData.doses.length === 0) {
      const emptyUtterance = new SpeechSynthesisUtterance('You have no medications scheduled for today.');
      window.speechSynthesis.speak(emptyUtterance);
      return;
    }

    const { doses } = todayData;
    const pendingDoses = doses.filter((d) => d.status === 'PENDING' || d.status === 'SNOOZED');
    const takenDoses = doses.filter((d) => d.status === 'TAKEN');

    let text = `Hello ${member?.displayName || 'there'}. Here is your medication schedule for today. `;
    text += `You have ${doses.length} total scheduled doses. You have taken ${takenDoses.length} so far. `;

    if (pendingDoses.length > 0) {
      text += `You have ${pendingDoses.length} pending doses remaining: `;
      pendingDoses.forEach((d, idx) => {
        text += `Number ${idx + 1}: ${d.medication.name}, dosage ${d.medication.dosage}, scheduled at ${d.scheduledTime}. `;
        if (d.medication.instructions) {
          text += `Instructions: ${d.medication.instructions}. `;
        }
      });
    } else {
      text += `Wonderful news! All your scheduled doses for today have been completed. `;
    }

    if (nextAppointment) {
      const appDate = new Date(nextAppointment.dateTime).toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      const appTime = new Date(nextAppointment.dateTime).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      text += `Your next appointment is with ${nextAppointment.doctorName} on ${appDate} at ${appTime} at ${nextAppointment.location}.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for elderly clarity
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
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
          minHeight: '60vh',
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 700,
        }}
      >
        Loading your daily schedule...
      </div>
    );
  }

  const doses = todayData?.doses || [];
  const summary = todayData?.summary || {
    totalScheduled: 0,
    takenCount: 0,
    skippedCount: 0,
    snoozedCount: 0,
    pendingCount: 0,
    missedCount: 0,
    adherencePercentage: 100,
  };

  // Streak message computation
  const isStreakGreat = summary.totalScheduled > 0 && summary.takenCount === summary.totalScheduled;
  const streakMessage = isStreakGreat
    ? "🌟 Fantastic job! You have taken all your scheduled medications today! You're on a 5-day streak!"
    : summary.takenCount > 0
      ? `👏 You're on a great streak! ${summary.takenCount} of ${summary.totalScheduled} doses taken today. Keep it up!`
      : "☀️ A fresh day of healthy habits! Taking your medications on time keeps you feeling your best.";

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {actionFeedback}
      </div>

      {/* Header bar: Greeting & Audio Read-Aloud button */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Today's Schedule
          </h1>
          <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Big Read-Aloud Web Speech Button */}
        <button
          type="button"
          onClick={handleToggleSpeech}
          className={`btn ${isSpeaking ? 'btn-danger' : 'btn-primary'}`}
          style={{
            fontSize: 'var(--font-size-lg)',
            minHeight: '52px',
            padding: '12px 24px',
            borderRadius: 'var(--radius-lg)',
          }}
          aria-label={isSpeaking ? 'Stop reading schedule aloud' : 'Read today\'s schedule aloud'}
        >
          {isSpeaking ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}
          <span>{isSpeaking ? 'Stop Reading' : '🔊 Read Aloud'}</span>
        </button>
      </header>

      {/* Streak Message Box */}
      <aside
        aria-label="Daily Motivation and Streak"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px 24px',
          backgroundColor: isStreakGreat ? 'var(--color-success-bg)' : 'var(--color-primary-surface)',
          border: `2px solid ${isStreakGreat ? 'var(--color-success-border)' : 'var(--color-primary)'}`,
          borderRadius: 'var(--radius-lg)',
          marginBottom: '28px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Flame
          size={36}
          color={isStreakGreat ? 'var(--color-success)' : 'var(--color-primary)'}
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        />
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-main)' }}>
          {streakMessage}
        </div>
      </aside>

      {/* Next Appointment Card */}
      {nextAppointment && (
        <section
          aria-labelledby="next-app-heading"
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
            borderLeft: '6px solid var(--color-primary)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Calendar size={32} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <div>
            <h2 id="next-app-heading" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>
              Next Appointment: {nextAppointment.title}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
              <strong>{nextAppointment.doctorName}</strong> &bull;{' '}
              {new Date(nextAppointment.dateTime).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at{' '}
              {new Date(nextAppointment.dateTime).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              &bull; Location: {nextAppointment.location}
            </p>
          </div>
        </section>
      )}

      {/* Huge Dose Cards List */}
      <section aria-labelledby="doses-heading">
        <h2 id="doses-heading" className="sr-only">
          Scheduled Doses for Today
        </h2>

        {doses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-muted)' }}>
              No medications scheduled for today. Have a peaceful day!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {doses.map((dose) => {
              const isTaken = dose.status === 'TAKEN';
              const isSkipped = dose.status === 'SKIPPED';
              const isSnoozed = dose.status === 'SNOOZED';

              return (
                <article
                  key={dose.id}
                  className="card"
                  style={{
                    padding: '28px',
                    borderRadius: 'var(--radius-lg)',
                    border: `3px solid ${isTaken
                        ? 'var(--color-success-border)'
                        : isSkipped
                          ? 'var(--color-warning-border)'
                          : isSnoozed
                            ? 'var(--color-primary)'
                            : 'var(--color-border-strong)'
                      }`,
                    backgroundColor: isTaken ? 'var(--color-success-bg)' : 'var(--color-surface)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  aria-labelledby={`dose-title-${dose.id}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      {/* Big Scheduled Time */}
                      <div
                        style={{
                          fontSize: 'var(--font-size-3xl)',
                          fontWeight: 900,
                          color: 'var(--color-primary-active)',
                          marginBottom: '4px',
                        }}
                      >
                        {dose.scheduledTime}
                      </div>

                      {/* Huge Medication Name */}
                      <h3
                        id={`dose-title-${dose.id}`}
                        style={{
                          fontSize: 'var(--font-size-2xl)',
                          fontWeight: 800,
                          color: 'var(--color-text-main)',
                        }}
                      >
                        {dose.medication.name}
                      </h3>

                      {/* Dosage & Purpose */}
                      <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Dose: <strong>{dose.medication.dosage}</strong>
                        {dose.medication.purpose && <span> &bull; For {dose.medication.purpose}</span>}
                      </p>

                      {/* Clear Instructions */}
                      {dose.medication.instructions && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '10px 14px',
                            backgroundColor: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                            color: 'var(--color-text-main)',
                          }}
                        >
                          Instructions: {dose.medication.instructions}
                        </div>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div>
                      <StatusPill status={dose.status} />
                    </div>
                  </div>

                  {/* Action Buttons for Elder/Caretaker */}
                  {!isFamily && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flexWrap: 'wrap',
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '2px solid var(--color-border)',
                      }}
                    >
                      {/* Big "I took it" button */}
                      <button
                        type="button"
                        onClick={() => handleTakeDose(dose)}
                        disabled={isTaken}
                        className="btn btn-success"
                        style={{
                          flex: 2,
                          minHeight: '60px',
                          fontSize: 'var(--font-size-xl)',
                          fontWeight: 800,
                          borderRadius: 'var(--radius-md)',
                          boxShadow: isTaken ? 'none' : 'var(--shadow-md)',
                        }}
                        aria-label={`I took ${dose.medication.name} at ${dose.scheduledTime}`}
                      >
                        <CheckCircle2 size={28} aria-hidden="true" />
                        <span>{isTaken ? '✓ Taken' : 'I took it'}</span>
                      </button>

                      {/* Skip button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSkipModalDose(dose);
                          setSkipReason('');
                        }}
                        disabled={isTaken || isSkipped}
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          minHeight: '60px',
                          fontSize: 'var(--font-size-lg)',
                          borderRadius: 'var(--radius-md)',
                        }}
                        aria-label={`Skip ${dose.medication.name} at ${dose.scheduledTime}`}
                      >
                        <span>Skip</span>
                      </button>

                      {/* Snooze button (30 mins) */}
                      {!isTaken && (
                        <button
                          type="button"
                          onClick={() => handleSnooze(dose)}
                          className="btn btn-secondary"
                          style={{
                            minHeight: '60px',
                            padding: '10px 18px',
                            fontSize: 'var(--font-size-base)',
                          }}
                          aria-label={`Snooze ${dose.medication.name} for 30 minutes`}
                        >
                          <BellRing size={20} aria-hidden="true" />
                          <span>Snooze 30m</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isFamily && (
                    <div style={{ marginTop: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Family observation mode: read-only access
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Skip Confirmation Modal */}
      {skipModalDose && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="skip-dialog-title">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 id="skip-dialog-title" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                Skip {skipModalDose.medication.name}?
              </h3>
              <button
                type="button"
                onClick={() => setSkipModalDose(null)}
                className="btn btn-secondary"
                style={{ minHeight: '36px', padding: '6px' }}
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Are you sure you want to skip this dose scheduled for {skipModalDose.scheduledTime}? Please share a reason if possible:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="skip-reason">Reason for skipping (Optional):</label>
              <input
                id="skip-reason"
                type="text"
                placeholder="e.g. Feeling nauseous, doctor advised to hold"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSkipModalDose(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmSkip}
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

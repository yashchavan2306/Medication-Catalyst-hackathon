import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { ElderTodayPage } from '../pages/ElderTodayPage.js';
import * as AuthContextModule from '../context/AuthContext.js';
import * as MedicationsApiModule from '../api/medicationsApi.js';
import * as CommonApiModule from '../api/commonApi.js';
import { ToastProvider } from '../context/ToastContext.js';

describe('Elder Today Page & Dose Button Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTodayDoses = {
    date: '2026-11-15',
    summary: {
      totalScheduled: 2,
      takenCount: 0,
      skippedCount: 0,
      snoozedCount: 0,
      pendingCount: 2,
      missedCount: 0,
      adherencePercentage: 0,
    },
    doses: [
      {
        id: 'dose-101',
        circleId: 'circle-1',
        medicationId: 'med-1',
        scheduledDate: '2026-11-15',
        scheduledTime: '08:00',
        status: 'PENDING' as const,
        snoozedUntil: null,
        takenAt: null,
        recordedByRole: 'system',
        recordedByName: 'Scheduled',
        notes: null,
        medication: {
          id: 'med-1',
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          instructions: 'Take with breakfast',
          purpose: 'Blood sugar control',
          remainingQuantity: 28,
          refillThreshold: 5,
        },
      },
      {
        id: 'dose-102',
        circleId: 'circle-1',
        medicationId: 'med-2',
        scheduledDate: '2026-11-15',
        scheduledTime: '20:00',
        status: 'PENDING' as const,
        snoozedUntil: null,
        takenAt: null,
        recordedByRole: 'system',
        recordedByName: 'Scheduled',
        notes: null,
        medication: {
          id: 'med-2',
          name: 'Atorvastatin',
          dosage: '20mg',
          frequency: 'Once daily at night',
          instructions: 'Take before sleep',
          purpose: 'Cholesterol',
          remainingQuantity: 14,
          refillThreshold: 5,
        },
      },
    ],
  };

  it('renders huge dose cards with streak message and next appointment', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: 'circle-1', role: 'elder', displayName: 'Eleanor' },
      circle: null,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.spyOn(MedicationsApiModule, 'getTodayDosesApi').mockResolvedValue(mockTodayDoses);
    vi.spyOn(CommonApiModule, 'getAppointmentsApi').mockResolvedValue([
      {
        id: 'app-1',
        circleId: 'circle-1',
        title: 'Cardiology Check',
        doctorName: 'Dr. Robert Vance',
        location: 'Memorial Hospital',
        dateTime: '2026-11-16T14:00:00.000Z',
        status: 'UPCOMING',
      },
    ]);

    const { container } = render(
      <ToastProvider>
        <MemoryRouter>
          <ElderTodayPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
      expect(screen.getByText('Metformin')).toBeInTheDocument();
      expect(screen.getByText('Atorvastatin')).toBeInTheDocument();
      expect(screen.getByText(/Next Appointment: Cardiology Check/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Read today's schedule aloud/i })).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('clicking the big "I took it" button records dose and updates UI state', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: 'circle-1', role: 'elder', displayName: 'Eleanor' },
      circle: null,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.spyOn(MedicationsApiModule, 'getTodayDosesApi').mockResolvedValue(mockTodayDoses);
    vi.spyOn(CommonApiModule, 'getAppointmentsApi').mockResolvedValue([]);

    const takeDoseMock = vi.spyOn(MedicationsApiModule, 'takeDoseApi').mockResolvedValue({
      message: 'Dose marked as taken',
      dose: {
        ...mockTodayDoses.doses[0],
        status: 'TAKEN',
        takenAt: new Date().toISOString(),
      },
      remainingQuantity: 27,
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <ElderTodayPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Metformin')).toBeInTheDocument();
    });

    const tookItButton = screen.getByRole('button', { name: /I took Metformin at 08:00/i });
    expect(tookItButton).toBeInTheDocument();
    expect(tookItButton).toHaveTextContent(/I took it/i);

    fireEvent.click(tookItButton);

    await waitFor(() => {
      expect(takeDoseMock).toHaveBeenCalledWith('dose-101');
      expect(screen.getByRole('button', { name: /I took Metformin at 08:00/i })).toHaveTextContent(/✓ Taken/i);
    });
  });
});

import { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { DoseCard } from '../components/DoseCard.js';
import * as AuthContextModule from '../context/AuthContext.js';
import type { DailyDoseItem } from '../types/medication.js';

describe('DoseCard Component & WCAG AA Accessibility', () => {
  const sampleDose: DailyDoseItem = {
    medicationId: 'med-1',
    medicationName: 'Lisinopril',
    dosage: '10mg',
    instructions: 'Take with food and water',
    scheduledDate: '2026-11-15',
    scheduledTime: '08:00',
    status: 'PENDING',
    remainingQuantity: 28,
  };

  it('renders dose information and satisfies WCAG AA accessibility with no violations', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: 'c1', role: 'elder', displayName: 'Elder Rose' },
      circle: null,
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const onRecordMock = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <DoseCard dose={sampleDose} onRecord={onRecordMock} />
    );

    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('Lisinopril')).toBeInTheDocument();
    expect(screen.getByText(/Take with food and water/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark Lisinopril at 08:00 as taken/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('triggers onRecord when "Mark as Taken" is clicked', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: 'c1', role: 'caretaker', displayName: 'Nurse Joy' },
      circle: null,
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const onRecordMock = vi.fn().mockResolvedValue(undefined);

    render(<DoseCard dose={sampleDose} onRecord={onRecordMock} />);

    const takeButton = screen.getByRole('button', { name: /Mark Lisinopril at 08:00 as taken/i });
    await act(async () => {
      fireEvent.click(takeButton);
    });

    expect(onRecordMock).toHaveBeenCalledWith('TAKEN');
  });

  it('hides edit action buttons for family read-only members', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      member: { circleId: 'c1', role: 'family', displayName: 'Family Member' },
      circle: null,
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      createCircle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(<DoseCard dose={sampleDose} onRecord={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Mark as Taken/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Family view: read-only access/i)).toBeInTheDocument();
  });
});

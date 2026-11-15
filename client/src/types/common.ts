import type { AuthMember, CircleInfo } from './auth.js';
import type { TodayDose } from './medication.js';

export interface Appointment {
  id: string;
  circleId: string;
  title: string;
  doctorName: string;
  location: string;
  dateTime: string;
  notes?: string | null;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  createdByRole?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface ActivityItem {
  id: string;
  circleId: string;
  action: string;
  description: string;
  actorRole: string;
  actorName: string;
  createdAt: string;
}

export interface DashboardResponse {
  member: AuthMember;
  circle: CircleInfo;
  today: {
    date: string;
    summary: {
      totalScheduled: number;
      takenCount: number;
      pendingCount: number;
      skippedCount: number;
      snoozedCount: number;
      missedCount: number;
      adherencePercentage: number;
    };
    doses: TodayDose[];
  };
  stats: {
    weeklyAdherenceRate: number;
    totalActiveMedications: number;
    pendingApprovalsCount: number;
    lowRefillCount: number;
  };
  lowRefillMeds: Array<{
    id: string;
    name: string;
    dosage: string;
    remainingQuantity: number;
    refillThreshold: number;
  }>;
  upcomingAppointments: Appointment[];
  recentActivity: ActivityItem[];
}

export interface AdherenceReportResponse {
  periodDays: number;
  sinceDate: string;
  summary: {
    total: number;
    taken: number;
    skipped: number;
    missed: number;
    snoozed: number;
    adherenceRate: number;
  };
  dailyBreakdown: Array<{
    date: string;
    taken: number;
    skipped: number;
    missed: number;
    total: number;
  }>;
  medicationBreakdown: Array<{
    medicationId: string;
    medicationName: string;
    dosage: string;
    taken: number;
    total: number;
    adherenceRate: number;
  }>;
}

export interface EmergencyInfoResponse {
  elderName: string;
  elderEmail?: string | null;
  circleCode: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalNotes?: string | null;
  activeMedications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string | null;
    purpose?: string | null;
  }>;
  nextAppointment?: Appointment | null;
}

export interface VitalLog {
  id: string;
  circleId: string;
  recordedAt: string;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  mood?: 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'UNWELL' | null;
  notes?: string | null;
  recordedByRole: string;
  recordedByName: string;
}

export interface NotificationLog {
  id: string;
  circleId: string;
  type: 'MISSED_DOSE' | 'LOW_REFILL' | 'PENDING_APPROVAL' | 'APPOINTMENT' | 'LOW_REFILL';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

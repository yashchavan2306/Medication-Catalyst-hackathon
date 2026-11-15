export interface Appointment {
  id: string;
  circleId: string;
  title: string;
  doctorName: string;
  location: string;
  dateTime: string;
  notes?: string | null;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  createdByRole: string;
  createdByName: string;
  createdAt: string;
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
  type: 'MISSED_DOSE' | 'LOW_REFILL' | 'PENDING_APPROVAL' | 'APPOINTMENT';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

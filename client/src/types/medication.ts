export interface Medication {
  id: string;
  circleId: string;
  name: string;
  dosage: string;
  frequency: string;
  timesOfDay: string[];
  instructions?: string | null;
  purpose?: string | null;
  remainingQuantity: number;
  refillThreshold: number;
  isActive: boolean;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  hasPendingChange?: boolean;
  pendingChange?: {
    id: string;
    changeType: 'CREATE' | 'UPDATE' | 'DELETE';
    requestedByName: string;
    createdAt: string;
  } | null;
}

export interface MedicationChangeRequest {
  id: string;
  circleId: string;
  medicationId?: string | null;
  medication?: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    isActive: boolean;
  } | null;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedData: Partial<Medication>;
  currentData?: Partial<Medication> | null;
  requestedByRole: string;
  requestedByName: string;
  reason?: string | null;
  reviewedByRole?: string | null;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface DailyDoseItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  scheduledDate: string;
  scheduledTime: string;
  status: 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';
  logId?: string;
  takenAt?: string | null;
  recordedByName?: string;
  recordedByRole?: string;
  notes?: string | null;
  remainingQuantity: number;
}

export interface DailyScheduleResponse {
  date: string;
  summary: {
    totalScheduled: number;
    takenCount: number;
    skippedCount: number;
    missedCount: number;
    pendingCount: number;
    adherencePercentage: number;
  };
  schedule: DailyDoseItem[];
}

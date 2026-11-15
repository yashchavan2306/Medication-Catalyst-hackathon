export type Role = 'elder' | 'caretaker' | 'family';

export interface AuthMember {
  circleId: string;
  role: Role;
  displayName: string;
}

export interface CircleInfo {
  id: string;
  code: string;
  name: string;
  elderName: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  createdAt?: string;
  stats?: {
    activeMedicationsCount: number;
    upcomingAppointmentsCount: number;
    pendingApprovalsCount: number;
  };
}

export interface LoginResponse {
  token: string;
  member: AuthMember;
  circle: CircleInfo;
}

export interface CreateCircleInput {
  name: string;
  elderName: string;
  elderPasscode: string;
  caretakerPasscode: string;
  familyPasscode: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface LoginInput {
  circleCode: string;
  passcode: string;
  displayName?: string;
}

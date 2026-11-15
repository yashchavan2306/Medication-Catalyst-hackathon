export type Role = 'elder' | 'caretaker' | 'family';

export interface AuthMember {
  circleId: string;
  role: Role;
  displayName: string;
  circleCode?: string;
  elderName?: string;
}

export interface CircleInfo {
  id: string;
  code: string;
  name: string;
  elderName: string;
  elderEmail?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  createdAt?: string;
  stats?: {
    activeMedicationsCount: number;
    upcomingAppointmentsCount: number;
    pendingApprovalsCount?: number;
  };
}

export interface LoginResponse {
  token: string;
  member: AuthMember;
  circle?: CircleInfo;
}

export interface CreateCircleResult {
  circleCode: string;
  passcodes: {
    elder: string;
    caretaker: string;
    family: string;
  };
  token: string;
  member: AuthMember;
  circle: CircleInfo;
}

export interface CreateCircleInput {
  name?: string;
  elderName: string;
  elderEmail?: string;
  elderPasscode?: string;
  caretakerPasscode?: string;
  familyPasscode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface LoginInput {
  circleCode: string;
  passcode: string;
  displayName?: string;
}

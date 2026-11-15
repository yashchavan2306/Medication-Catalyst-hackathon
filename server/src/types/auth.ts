/**
 * Roles supported by CareCircle:
 * - elder: owner, full control, approves changes
 * - caretaker: adds/edits meds and appointments; medication changes need elder approval
 * - family: read-only
 */
export type Role = 'elder' | 'caretaker' | 'family';

export interface AuthMember {
  circleId: string;
  memberId?: string;
  role: Role;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      member?: AuthMember;
    }
  }
}

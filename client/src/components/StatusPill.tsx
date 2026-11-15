import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  Shield,
  Heart,
  Users,
} from 'lucide-react';

export type StatusType =
  | 'TAKEN'
  | 'SKIPPED'
  | 'SNOOZED'
  | 'MISSED'
  | 'PENDING'
  | 'UPCOMING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'APPROVED'
  | 'REJECTED'
  | 'elder'
  | 'caretaker'
  | 'family'
  | string;

interface StatusPillProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, label, className = '' }) => {
  const normalized = status.toUpperCase();

  let badgeClass = 'badge-neutral';
  let Icon = Clock;
  let text = label || status;

  switch (normalized) {
    case 'TAKEN':
    case 'COMPLETED':
    case 'APPROVED':
      badgeClass = 'badge-success';
      Icon = CheckCircle2;
      text = label || (normalized === 'TAKEN' ? 'Taken' : normalized === 'COMPLETED' ? 'Completed' : 'Approved');
      break;
    case 'SKIPPED':
    case 'SNOOZED':
      badgeClass = 'badge-warning';
      Icon = AlertCircle;
      text = label || (normalized === 'SKIPPED' ? 'Skipped' : 'Snoozed');
      break;
    case 'MISSED':
    case 'REJECTED':
    case 'CANCELLED':
      badgeClass = 'badge-danger';
      Icon = XCircle;
      text = label || (normalized === 'MISSED' ? 'Missed' : normalized === 'REJECTED' ? 'Rejected' : 'Cancelled');
      break;
    case 'UPCOMING':
      badgeClass = 'badge-neutral';
      Icon = Calendar;
      text = label || 'Upcoming';
      break;
    case 'ELDER':
      badgeClass = 'badge-success';
      Icon = Heart;
      text = label || 'Elder';
      break;
    case 'CARETAKER':
      badgeClass = 'badge-warning';
      Icon = Shield;
      text = label || 'Caretaker';
      break;
    case 'FAMILY':
      badgeClass = 'badge-neutral';
      Icon = Users;
      text = label || 'Family';
      break;
    case 'PENDING':
    default:
      badgeClass = 'badge-neutral';
      Icon = Clock;
      text = label || 'Pending';
      break;
  }

  return (
    <span className={`badge ${badgeClass} ${className}`} aria-label={`Status: ${text}`}>
      <Icon size={16} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
};

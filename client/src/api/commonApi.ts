import { apiFetch } from './client.js';
import type { Appointment, VitalLog, NotificationLog } from '../types/common.js';
import type { CircleInfo } from '../types/auth.js';

export async function getAppointmentsApi(status = 'UPCOMING'): Promise<Appointment[]> {
  return apiFetch<Appointment[]>(`/appointments?status=${status}`);
}

export async function createAppointmentApi(data: Partial<Appointment>): Promise<Appointment> {
  return apiFetch<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAppointmentApi(id: string, data: Partial<Appointment>): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAppointmentApi(id: string): Promise<{ message: string }> {
  return apiFetch(`/appointments/${id}`, {
    method: 'DELETE',
  });
}

export async function getVitalsApi(limit = 20): Promise<VitalLog[]> {
  return apiFetch<VitalLog[]>(`/vitals?limit=${limit}`);
}

export async function logVitalApi(data: Partial<VitalLog>): Promise<VitalLog> {
  return apiFetch<VitalLog>('/vitals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNotificationsApi(unreadOnly = false): Promise<{
  unreadCount: number;
  notifications: NotificationLog[];
}> {
  return apiFetch(`/notifications?unreadOnly=${unreadOnly}`);
}

export async function markNotificationAsReadApi(id: string): Promise<NotificationLog> {
  return apiFetch<NotificationLog>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsReadApi(): Promise<{ message: string }> {
  return apiFetch('/notifications/mark-all-read', {
    method: 'POST',
  });
}

export async function getCircleDetailsApi(): Promise<CircleInfo> {
  return apiFetch<CircleInfo>('/circles');
}

export async function updateCircleApi(data: Partial<CircleInfo>): Promise<CircleInfo> {
  return apiFetch<CircleInfo>('/circles', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updatePasscodesApi(passcodes: {
  elderPasscode?: string;
  caretakerPasscode?: string;
  familyPasscode?: string;
}): Promise<{ message: string }> {
  return apiFetch('/circles/passcodes', {
    method: 'POST',
    body: JSON.stringify(passcodes),
  });
}

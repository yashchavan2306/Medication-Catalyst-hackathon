import { apiFetch } from './client.js';
import type { Medication, MedicationChangeRequest, DailyScheduleResponse } from '../types/medication.js';

export async function getMedicationsApi(includeInactive = false): Promise<Medication[]> {
  return apiFetch<Medication[]>(`/medications?includeInactive=${includeInactive}`);
}

export async function getMedicationByIdApi(id: string): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`);
}

export async function createMedicationApi(data: Partial<Medication> & { reason?: string }): Promise<{
  status: 'CREATED' | 'PENDING_APPROVAL';
  message: string;
  medication?: Medication;
  changeRequest?: MedicationChangeRequest;
}> {
  return apiFetch('/medications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMedicationApi(
  id: string,
  data: Partial<Medication> & { reason?: string }
): Promise<{
  status: 'UPDATED' | 'PENDING_APPROVAL';
  message: string;
  medication?: Medication;
  changeRequest?: MedicationChangeRequest;
}> {
  return apiFetch(`/medications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMedicationApi(id: string): Promise<{
  status: 'DEACTIVATED' | 'PENDING_APPROVAL';
  message: string;
  changeRequest?: MedicationChangeRequest;
}> {
  return apiFetch(`/medications/${id}`, {
    method: 'DELETE',
  });
}

export async function getApprovalsApi(status = 'PENDING'): Promise<MedicationChangeRequest[]> {
  return apiFetch<MedicationChangeRequest[]>(`/approvals?status=${status}`);
}

export async function approveRequestApi(id: string, reviewNotes?: string): Promise<{ status: string; message: string }> {
  return apiFetch(`/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reviewNotes }),
  });
}

export async function rejectRequestApi(id: string, reviewNotes?: string): Promise<{ status: string; message: string }> {
  return apiFetch(`/approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reviewNotes }),
  });
}

export async function getDailyScheduleApi(date?: string): Promise<DailyScheduleResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<DailyScheduleResponse>(`/adherence/today${query}`);
}

export async function logDoseApi(input: {
  medicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'TAKEN' | 'SKIPPED' | 'MISSED';
  notes?: string;
}): Promise<{ message: string; remainingQuantity: number }> {
  return apiFetch('/adherence/log', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getAdherenceStatsApi(days = 7): Promise<{
  periodDays: number;
  summary: {
    taken: number;
    skipped: number;
    missed: number;
    totalLogged: number;
    adherenceRate: number;
  };
}> {
  return apiFetch(`/adherence/stats?days=${days}`);
}

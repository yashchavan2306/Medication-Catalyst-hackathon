import { apiFetch } from './client.js';
import type { Medication, MedicationChangeRequest, TodayDosesResponse, TodayDose } from '../types/medication.js';

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
    method: 'PUT',
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

export async function getTodayDosesApi(): Promise<TodayDosesResponse> {
  return apiFetch<TodayDosesResponse>('/today');
}

export async function takeDoseApi(id: string): Promise<{ message: string; dose: TodayDose; remainingQuantity: number }> {
  return apiFetch(`/doses/${id}/take`, {
    method: 'POST',
  });
}

export async function skipDoseApi(id: string, reason?: string): Promise<{ message: string; dose: TodayDose }> {
  return apiFetch(`/doses/${id}/skip`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function snoozeDoseApi(id: string, minutes = 30): Promise<{ message: string; dose: TodayDose }> {
  return apiFetch(`/doses/${id}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });
}

import { apiFetch } from './client.js';
import type { LoginInput, CreateCircleInput, LoginResponse, CreateCircleResult, AuthMember, CircleInfo } from '../types/auth.js';

export async function loginApi(input: LoginInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutApi(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export async function createCircleApi(input: CreateCircleInput): Promise<CreateCircleResult> {
  return apiFetch<CreateCircleResult>('/circles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMeApi(): Promise<{ member: AuthMember; circle: CircleInfo }> {
  return apiFetch<{ member: AuthMember; circle: CircleInfo }>('/me');
}

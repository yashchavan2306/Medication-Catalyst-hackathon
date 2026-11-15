import { apiFetch } from './client.js';
import type { LoginInput, CreateCircleInput, LoginResponse, AuthMember, CircleInfo } from '../types/auth.js';

export async function loginApi(input: LoginInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createCircleApi(input: CreateCircleInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/create-circle', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMeApi(): Promise<{ member: AuthMember; circle: CircleInfo }> {
  return apiFetch<{ member: AuthMember; circle: CircleInfo }>('/auth/me');
}

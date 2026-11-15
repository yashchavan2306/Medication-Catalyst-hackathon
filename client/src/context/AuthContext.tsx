import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthMember, CircleInfo, LoginInput, CreateCircleInput } from '../types/auth.js';
import { loginApi, createCircleApi, getMeApi } from '../api/authApi.js';

interface AuthContextValue {
  member: AuthMember | null;
  circle: CircleInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  createCircle: (input: CreateCircleInput) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'carecircle_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [member, setMember] = useState<AuthMember | null>(null);
  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentMember = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setMember(null);
      setCircle(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getMeApi();
      setMember(data.member);
      setCircle(data.circle);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setMember(null);
      setCircle(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentMember();
  }, [fetchCurrentMember]);

  const login = async (input: LoginInput): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await loginApi(input);
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setMember(res.member);
      setCircle(res.circle);
    } finally {
      setIsLoading(false);
    }
  };

  const createCircle = async (input: CreateCircleInput): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await createCircleApi(input);
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setMember(res.member);
      setCircle(res.circle);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMember(null);
    setCircle(null);
  };

  const refreshProfile = async (): Promise<void> => {
    await fetchCurrentMember();
  };

  return (
    <AuthContext.Provider
      value={{
        member,
        circle,
        token,
        isAuthenticated: !!token && !!member,
        isLoading,
        login,
        createCircle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Access member identity strictly through useAuth().
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

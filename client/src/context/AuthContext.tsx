import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthMember, CircleInfo, LoginInput, CreateCircleInput, CreateCircleResult } from '../types/auth.js';
import { loginApi, logoutApi, createCircleApi, getMeApi } from '../api/authApi.js';

interface AuthContextValue {
  member: AuthMember | null;
  circle: CircleInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthMember>;
  createCircle: (input: CreateCircleInput) => Promise<CreateCircleResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'carecircle_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });
  const [member, setMember] = useState<AuthMember | null>(null);
  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentMember = useCallback(async () => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
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

  const login = async (input: LoginInput): Promise<AuthMember> => {
    setIsLoading(true);
    try {
      const res = await loginApi(input);
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      setToken(res.token);
      setMember(res.member);
      if (res.circle) {
        setCircle(res.circle || null);
      } else {
        // fetch circle info from /me
        try {
          const meData = await getMeApi();
          setCircle(meData.circle);
        } catch {
          // ignore error if /me fails
        }
      }
      return res.member;
    } finally {
      setIsLoading(false);
    }
  };

  const createCircle = async (input: CreateCircleInput): Promise<CreateCircleResult> => {
    setIsLoading(true);
    try {
      const res = await createCircleApi(input);
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      setToken(res.token);
      setMember(res.member);
      setCircle(res.circle || null);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } catch {
      // Continue even if server logout fails
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      setToken(null);
      setMember(null);
      setCircle(null);
    }
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

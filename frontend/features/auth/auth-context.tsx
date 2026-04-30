'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, clearRefCache } from '@/services/api';

export type Department = { id: number; name: string };

export type AuthUser = {
  id: number;
  email: string;
  fullName?: string;
  role: 'admin' | 'staff' | 'viewer' | 'user' | 'teacher' | 'student' | 'inspector' | 'restauration';
  departments: Department[];
  studentProfile?: { id: number; classId: number | null; fullName: string } | null;
  teacherProfile?: { id: number; departmentId: number; firstName: string; lastName: string } | null;
};

type ProfileUpdate = { fullName?: string; email?: string; password?: string };

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<{ submitted?: boolean; passwordUpdated?: boolean } | void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('deaa_token');
    if (!token) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    api
      .get<{ sub: number; email: string; role: AuthUser['role']; fullName?: string; departments: Department[]; studentProfile?: AuthUser['studentProfile']; teacherProfile?: AuthUser['teacherProfile'] }>('/auth/me')
      .then((response) => {
        const data = response.data;
        setUser({
          id: data.sub,
          email: data.email,
          role: data.role,
          fullName: data.fullName,
          departments: data.departments ?? [],
          studentProfile: data.studentProfile ?? null,
          teacherProfile: data.teacherProfile ?? null,
        });
      })
      .catch(() => {
        clearRefCache();
        localStorage.removeItem('deaa_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (identifier: string, password: string) => {
        const response = await api.post<{
          access_token: string;
          user: { id: number; email: string; fullName?: string; role: AuthUser['role']; departments: Department[] };
        }>('/auth/login', { identifier, password });
        const { access_token } = response.data;
        clearRefCache();
        localStorage.setItem('deaa_token', access_token);
        const me = await api.get<{
          sub: number;
          email: string;
          role: AuthUser['role'];
          fullName?: string;
          departments: Department[];
          studentProfile?: AuthUser['studentProfile'];
          teacherProfile?: AuthUser['teacherProfile'];
        }>('/auth/me');
        setUser({
          id: me.data.sub,
          email: me.data.email,
          role: me.data.role,
          fullName: me.data.fullName,
          departments: me.data.departments ?? [],
          studentProfile: me.data.studentProfile ?? null,
          teacherProfile: me.data.teacherProfile ?? null,
        });
      },
      logout: () => {
        clearRefCache();
        localStorage.removeItem('deaa_token');
        setUser(null);
      },
      updateProfile: async (data: ProfileUpdate) => {
        const updateRes = await api.patch<{ submitted?: boolean; passwordUpdated?: boolean }>('/auth/profile', data);
        // Re-fetch authoritative data
        const res = await api.get<{
          sub: number;
          email: string;
          role: AuthUser['role'];
          fullName?: string;
          departments: Department[];
          studentProfile?: AuthUser['studentProfile'];
          teacherProfile?: AuthUser['teacherProfile'];
        }>('/auth/me');
        setUser({
          id: res.data.sub,
          email: res.data.email,
          role: res.data.role,
          fullName: res.data.fullName,
          departments: res.data.departments ?? [],
          studentProfile: res.data.studentProfile ?? null,
          teacherProfile: res.data.teacherProfile ?? null,
        });
        return updateRes.data;
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

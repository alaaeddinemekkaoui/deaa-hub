'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/services/api';

type AuthUser = {
  id: number;
  email: string;
  fullName?: string;
  role: 'admin' | 'staff' | 'viewer';
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
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
      .get('/auth/me')
      .then((response) => {
        const data = response.data;
        setUser({ id: data.sub, email: data.email, role: data.role });
      })
      .catch(() => {
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
        const response = await api.post('/auth/login', { identifier, password });
        const { access_token, user: payloadUser } = response.data;
        localStorage.setItem('deaa_token', access_token);
        setUser({
          id: payloadUser.id,
          email: payloadUser.email,
          role: payloadUser.role,
        });
      },
      logout: () => {
        localStorage.removeItem('deaa_token');
        setUser(null);
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

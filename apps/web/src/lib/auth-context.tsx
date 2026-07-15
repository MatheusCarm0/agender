'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  business: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('auth_token');
    if (saved) {
      setToken(saved);
      api<User>('/auth/me', { token: saved })
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('auth_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{
      accessToken: string;
      user: User;
      business: User['business'];
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const t = res.accessToken;
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser({ ...res.user, business: res.business });
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api<{
      accessToken: string;
      user: User;
      business: User['business'];
    }>('/auth/register-business', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const t = res.accessToken;
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser({ ...res.user, business: res.business });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

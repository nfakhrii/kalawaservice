import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('kalawa_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('kalawa_token') || null);
  const [loading, setLoading] = useState(false);

  const saveSession = (newToken, newUser) => {
    localStorage.setItem('kalawa_token', newToken);
    localStorage.setItem('kalawa_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      saveSession(res.data.token, res.data.user);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const quickSwitchRole = async (role) => {
    setLoading(true);
    try {
      const res = await api.quickSwitchRole(role);
      saveSession(res.data.token, res.data.user);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('kalawa_token');
    localStorage.removeItem('kalawa_user');
    setToken(null);
    setUser(null);
  };

  // Jika belum ada sesi saat pertama kali dibuka, otomatis inisialisasi default demo (admin_cabang)
  // namun halaman /auth/login tetap dapat diakses penuh kapan saja
  useEffect(() => {
    if (!token || !user) {
      api
        .quickSwitchRole('admin_cabang')
        .then((res) => {
          saveSession(res.data.token, res.data.user);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        quickSwitchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}


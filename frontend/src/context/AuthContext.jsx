
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    return localStorage.getItem('kalawa_token');
  });

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('kalawa_token');
    localStorage.removeItem('kalawa_user');
    setToken(null);
    setUser(null);
  };

  const saveSession = (newToken, newUser) => {
    localStorage.setItem('kalawa_token', newToken);
    localStorage.setItem('kalawa_user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  };

  // Validasi sesi saat aplikasi pertama kali dibuka.
  // Tidak melakukan login otomatis.
  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const savedToken = localStorage.getItem('kalawa_token');

      if (!savedToken) {
        clearSession();
        if (active) setCheckingAuth(false);
        return;
      }

      try {
        // Endpoint ini harus mengirim Authorization: Bearer token.
        const res = await api.getMe();

        if (!active) return;

        const authenticatedUser = res.data;

        localStorage.setItem(
          'kalawa_user',
          JSON.stringify(authenticatedUser)
        );

        setToken(savedToken);
        setUser(authenticatedUser);
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, []);

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
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        checkingAuth,
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

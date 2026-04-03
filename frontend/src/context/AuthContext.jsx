import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext();

const resolveBackendUrl = () => {
  const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const candidates = rawBackendUrl
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (candidates.length === 1) return candidates[0];

  if (typeof window !== 'undefined') {
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const localCandidate = candidates.find((value) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(value));
    const remoteCandidate = candidates.find((value) => !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(value));

    if (isLocalHost && localCandidate) return localCandidate;
    if (!isLocalHost && remoteCandidate) return remoteCandidate;
  }

  return candidates[0] || 'http://localhost:3001';
};

const backendBaseUrl = resolveBackendUrl();

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const data = await requestJson('/auth/me', { method: 'GET' });
        if (active) setUser(data.user || null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async ({ username, password }) => {
    const data = await requestJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setUser(data.user || null);
    return data.user;
  };

  const logout = async () => {
    try {
      await requestJson('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network failures and still clear client state.
    }

    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

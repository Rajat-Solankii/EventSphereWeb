import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);
const API = 'http://localhost:3000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('es_token') || null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  // ===== Schedule silent token refresh 1 min before expiry (14min) =====
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => silentRefresh(), 14 * 60 * 1000);
  }, []);

  // ===== Silent refresh – called on load and on schedule =====
  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include' // sends httpOnly cookie
      });
      const data = await res.json();
      if (data.success) {
        setAccessToken(data.accessToken);
        setUser(data.user);
        localStorage.setItem('es_token', data.accessToken);
        scheduleRefresh();
        return data.accessToken;
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    }
    return null;
  }, [scheduleRefresh]);

  // ===== Init: try to restore session on page load =====
  useEffect(() => {
    silentRefresh().finally(() => setLoading(false));
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []);

  const clearAuth = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('es_token');
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  };

  const handleJsonResponse = async (res) => {
    try {
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw { message: 'Server returned an invalid response. The backend might be offline or unreachable.' };
      }
      if (!res.ok || data.success === false) throw { status: res.status, ...data, message: data.message || data.error || 'Request failed' };
      return data;
    } catch (err) {
      throw err;
    }
  };

  // ===== Login =====
  const login = async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await handleJsonResponse(res);

    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('es_token', data.accessToken);
    scheduleRefresh();
    return data;
  };

  // ===== Update User State =====
  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  };

  // ===== Register =====
  const register = async (name, email, password) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return await handleJsonResponse(res);
  };

  // ===== Forgot Password =====
  const forgotPassword = async (email) => {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await handleJsonResponse(res);
  };

  // ===== Reset Password =====
  const resetPassword = async (email, otp, newPassword) => {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
    return await handleJsonResponse(res);
  };

  // ===== Verify Email OTP =====
  const verifyEmail = async (email, otp) => {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return await handleJsonResponse(res);
  };

  // ===== Logout =====
  const logout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}
    clearAuth();
  };

  // ===== Logout from ALL devices =====
  const logoutAll = async () => {
    try {
      await authFetch('/api/auth/sessions', { method: 'DELETE' });
    } catch (_) {}
    clearAuth();
  };

  // ===== Authenticated fetch helper =====
  const authFetch = useCallback(async (path, options = {}) => {
    let token = accessToken;

    const doRequest = async (tok) => {
      return fetch(`${API}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${tok}`
        }
      });
    };

    let res = await doRequest(token);

    // If expired, try refresh once
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'TOKEN_EXPIRED') {
        const newToken = await silentRefresh();
        if (newToken) {
          res = await doRequest(newToken);
        } else {
          clearAuth();
          throw new Error('Session expired. Please log in again.');
        }
      }
    }

    return res;
  }, [accessToken, silentRefresh]);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      loading,
      login,
      register,
      logout,
      logoutAll,
      authFetch,
      isAuthenticated: !!user,
      forgotPassword,
      resetPassword,
      verifyEmail,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getStoredToken, setStoredToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const applyThemeToDom = (mode) => {
      const root = document.documentElement;
      if (mode === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
      }
    };

    const initAuth = async () => {
      try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        applyThemeToDom(savedTheme);

        const token = getStoredToken();
        if (token) {
          const res = await authAPI.getCurrentUser();
          const u = res.data.user;
          setUser(u);
          if (u?.theme_preference && (u.theme_preference === 'dark' || u.theme_preference === 'light')) {
            setTheme(u.theme_preference);
            applyThemeToDom(u.theme_preference);
            localStorage.setItem('theme', u.theme_preference);
          }
        }
      } catch (err) {
        setStoredToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const syncTheme = async (nextTheme) => {
    setTheme(nextTheme);
    const root = document.documentElement;
    if (nextTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('theme', nextTheme);
    } catch (e) {}
    if (user) {
      try {
        const res = await authAPI.updateProfile({ theme_preference: nextTheme });
        setUser(res.data.user);
      } catch (e) {}
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    syncTheme(next);
  };

  const login = async (credentials, remember = true) => {
    setError(null);
    try {
      const res = await authAPI.login(credentials);
      const { access_token, user: userData } = res.data;
      setStoredToken(access_token, remember);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Unable to sign in. Verify your credentials and ensure the backend server is running.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (payload, remember = true) => {
    setError(null);
    try {
      const res = await authAPI.register(payload);
      const { access_token, user: userData } = res.data;
      setStoredToken(access_token, remember);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Registration failed. Ensure the backend server is reachable.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginDemo = async () => {
    setError(null);
    try {
      const res = await authAPI.demoLogin();
      const { access_token, user: userData } = res.data;
      if (!access_token || !userData) {
        throw new Error('Invalid demo authentication response from server.');
      }
      setStoredToken(access_token, true);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Demo account login failed because the backend API server is unreachable. Start the FastAPI server on port 5000 and try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const updateUser = async (updates) => {
    setError(null);
    const res = await authAPI.updateProfile(updates);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        theme,
        setTheme: syncTheme,
        toggleTheme,
        login,
        register,
        loginDemo,
        updateUser,
        logout,
        clearError: () => setError(null),
      }}
    >
      <div className={theme === 'light' ? 'theme-light min-h-screen bg-[#F4F6FA] text-[#172033]' : 'theme-dark min-h-screen bg-[#080D18] text-[#F4F7FC]'}>
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;

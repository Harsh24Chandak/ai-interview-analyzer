import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { INITIAL_DEMO_USER } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        const token = localStorage.getItem('token');
        if (token) {
          const res = await authAPI.getCurrentUser();
          setUser(res.data.user);
        }
      } catch (err) {
        try {
          localStorage.removeItem('token');
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
  };

  const login = async (credentials) => {
    setError(null);
    const res = await authAPI.login(credentials);
    const { access_token, user: userData } = res.data;
    try {
      localStorage.setItem('token', access_token);
    } catch (e) {}
    setUser(userData);
    return userData;
  };

  const register = async (payload) => {
    setError(null);
    const res = await authAPI.register(payload);
    const { access_token, user: userData } = res.data;
    try {
      localStorage.setItem('token', access_token);
    } catch (e) {}
    setUser(userData);
    return userData;
  };

  const loginDemo = async () => {
    setError(null);
    try {
      const res = await authAPI.demoLogin();
      const { access_token, user: userData } = res.data;
      try {
        localStorage.setItem('token', access_token);
      } catch (e) {}
      setUser(userData);
      return userData;
    } catch (err) {
      setUser(INITIAL_DEMO_USER);
      return INITIAL_DEMO_USER;
    }
  };

  const updateUser = async (updates) => {
    const res = await authAPI.updateProfile(updates);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {}
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
        toggleTheme,
        login,
        register,
        loginDemo,
        updateUser,
        logout,
        clearError: () => setError(null),
      }}
    >
      <div className={theme === 'light' ? 'bg-slate-50 text-slate-900 min-h-screen' : 'bg-slate-950 text-slate-100 min-h-screen'}>
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

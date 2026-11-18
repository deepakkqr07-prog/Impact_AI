import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, getStoredUser, setStoredUser } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setTokenState] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const currentToken = getAuthToken();
      if (currentToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setStoredUser(profile);
        } catch (err) {
          console.error("Auth verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    initAuth();

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    setAuthToken(res.access_token);
    setStoredUser(res.user);
    setTokenState(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    setAuthToken(res.access_token);
    setStoredUser(res.user);
    setTokenState(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setTokenState(null);
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (user.role === 'Administrator') return true;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    register,
    logout,
    hasRole,
    isAdmin: user?.role === 'Administrator',
    isGovOfficer: user?.role === 'Government Monitoring Officer',
    isProjectManager: user?.role === 'Project Manager',
    isDeptOfficer: user?.role === 'Department Officer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

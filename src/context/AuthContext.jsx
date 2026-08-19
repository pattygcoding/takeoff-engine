import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('takeoff_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Handle Supabase Auth email redirect tokens from hash (e.g. #access_token=...&type=signup)
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = params.get('access_token');
          if (accessToken) {
            localStorage.setItem('takeoff_token', accessToken);
            // Clean up the hash from the browser URL bar
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        const currentUser = await authApi.getMe();
        if (currentUser) {
          setUser(currentUser);
          localStorage.setItem('takeoff_user', JSON.stringify(currentUser));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('takeoff_token', data.token);
    localStorage.setItem('takeoff_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    localStorage.setItem('takeoff_token', data.token);
    localStorage.setItem('takeoff_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const currentUser = await authApi.getMe();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('takeoff_user', JSON.stringify(currentUser));
      }
    } catch {
      // Ignore refresh errors
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isPaymentExempt: user?.role === 'payment_exempt' || user?.role === 'user_payment_exempt',
        loading,
        login,
        register,
        logout,
        setUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

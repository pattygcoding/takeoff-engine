import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/auth';

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
        setUser({ ...currentUser });
        localStorage.setItem('takeoff_user', JSON.stringify(currentUser));
        return currentUser;
      }
    } catch {
      // Ignore refresh errors
    }
  };

  // Background auto-sync: polls every 4 seconds when user is logged in
  // so any tier/status change in the DB (via Webhooks, admin, or sandbox) reflects instantly without manual refresh
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      // Only refresh if tab is visible to minimize unnecessary requests
      if (document.visibilityState === 'visible') {
        authApi.getMe().then((latest) => {
          if (latest) {
            setUser((prev) => {
              if (
                !prev ||
                prev.subscription_tier !== latest.subscription_tier ||
                prev.subscription_status !== latest.subscription_status ||
                prev.has_unlimited_bypass !== latest.has_unlimited_bypass ||
                prev.role !== latest.role ||
                prev.trial_uses_remaining !== latest.trial_uses_remaining ||
                prev.seat_limit !== latest.seat_limit ||
                prev.additional_seats !== latest.additional_seats
              ) {
                localStorage.setItem('takeoff_user', JSON.stringify(latest));
                return { ...latest };
              }
              return prev;
            });
          }
        }).catch(() => {});
      }
    }, 4000);

    // Also re-check immediately whenever window gains focus
    const handleFocus = () => {
      refreshProfile();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isPaymentExempt: user?.role === 'payment_exempt',
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

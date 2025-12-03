/**
 * Auth Context
 * Manages authentication state across the app
 */

import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services';
import { STORAGE_KEYS } from '../constants';
import useInactivity from '../hooks/useInactivity';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle logout function
  const handleLogout = () => {
    authService.logout(); // Clears local storage
    setUser(null);
    setIsAuthenticated(false);
  };

  // Auto-logout on inactivity (5 minutes)
  // Always call the hook (React rules), but enable/disable based on auth state
  useInactivity(
    () => {
      // Only logout if user is authenticated
      if (isAuthenticated) {
        console.log('User inactive for 5 minutes. Auto-logging out...');
        handleLogout();
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    },
    5, // 5 minutes of inactivity
    isAuthenticated // Only enable when user is authenticated
  );

  // Initialize auth state from local storage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // Verify token is still valid by fetching current user
        try {
          const response = await authService.getCurrentUser();
          setUser(response.data);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
        } catch (error) {
          // Token is invalid, clear auth
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { access, refresh } = response.data;

      // Store tokens
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);

      // Fetch user profile
      const userResponse = await authService.getCurrentUser();
      const userData = userResponse.data;

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      // After successful registration, automatically log in
      const loginResult = await login({
        username: userData.username,
        password: userData.password
      });

      return loginResult;
    } catch (error) {
      console.error('Registration error:', error);
      const errorData = error.response?.data || {};
      
      // Format error messages
      let errorMessage = 'Registration failed. Please try again.';
      if (typeof errorData === 'object') {
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`;
            }
            return `${key}: ${value}`;
          })
          .join('\n');
        errorMessage = errorMessages || errorMessage;
      }

      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    handleLogout();
  };

  const updateUser = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Update failed. Please try again.' 
      };
    }
  };

  const isAdmin = () => {
    // Check for is_superuser (admin) - not just is_staff
    return user?.user?.is_superuser || false;
  };

  const isStaff = () => {
    // Check if user is staff (is_staff but not necessarily superuser)
    return user?.user?.is_staff || false;
  };

  const isStaffOrAdmin = () => {
    // Check if user is either staff or admin
    return isStaff() || isAdmin();
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin: isAdmin(),
    isStaff: isStaff(),
    isStaffOrAdmin: isStaffOrAdmin(),
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;


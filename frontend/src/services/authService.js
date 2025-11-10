/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api from './api';

export const authService = {
  // User registration
  register: (userData) => {
    return api.post('/auth/register/', userData);
  },

  // Login - obtain JWT tokens
  login: (credentials) => {
    return api.post('/auth/token/', credentials);
  },

  // Refresh JWT token
  refreshToken: (refreshToken) => {
    return api.post('/auth/token/refresh/', { refresh: refreshToken });
  },

  // Get current user profile
  getCurrentUser: () => {
    return api.get('/auth/me/');
  },

  // Update user profile
  updateProfile: (profileData) => {
    // If profileData is FormData, set proper content-type
    const config = {};
    if (profileData instanceof FormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data',
      };
    }
    return api.patch('/auth/me/', profileData, config);
  },

  // Get all departments
  getDepartments: () => {
    return api.get('/auth/departments/');
  },

  // Get all courses
  getCourses: () => {
    return api.get('/auth/courses/');
  },

  // Get courses by department
  getCoursesByDepartment: (departmentId) => {
    return api.get(`/auth/courses/?department=${departmentId}`);
  },

  // Get all user profiles (admin only)
  getAllProfiles: () => {
    return api.get('/auth/profiles/');
  },

  // Get specific user profile
  getUserProfile: (profileId) => {
    return api.get(`/auth/profiles/${profileId}/`);
  },

  // Toggle user active status (admin only)
  toggleUserActive: (profileId) => {
    return api.post(`/auth/profiles/${profileId}/toggle_active/`);
  },

  // Reset user password (admin only)
  resetUserPassword: (profileId, newPassword) => {
    return api.post(`/auth/profiles/${profileId}/reset_password/`, {
      new_password: newPassword
    });
  },

  // Logout helper (clears local storage)
  logout: () => {
    localStorage.clear();
  }
};

export default authService;


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
    return api.patch('/auth/me/', profileData);
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

  // Logout helper (clears local storage)
  logout: () => {
    localStorage.clear();
  }
};

export default authService;


/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api, { cachedGet, clearApiCache } from './api';

export const authService = {
  // User registration
  register: (userData) => {
    return api.post('/auth/register/', userData);
  },

  // Login - obtain JWT tokens
  login: (credentials) => {
    return api.post('/auth/token/', credentials);
  },

  // Google sign-in (Google Identity Services credential token)
  loginWithGoogle: ({ credential, accessToken, password }) => {
    return api.post('/auth/google/', { credential, access_token: accessToken, password });
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

  // Change user password (requires old password)
  changePassword: (oldPassword, newPassword) => {
    return api.post('/auth/me/', {
      change_password: true,
      old_password: oldPassword,
      new_password: newPassword
    });
  },

  // Get all departments (cached 5 minutes)
  getDepartments: (forceRefresh = false) => {
    if (forceRefresh) {
      clearApiCache('/auth/departments/');
    }
    return cachedGet('/auth/departments/', {}, 5 * 60 * 1000);
  },

  // Get all courses (cached 5 minutes)
  getCourses: (forceRefresh = false) => {
    if (forceRefresh) {
      clearApiCache('/auth/courses/');
    }
    return cachedGet('/auth/courses/', {}, 5 * 60 * 1000);
  },

  // Get courses by department (cached 5 minutes)
  getCoursesByDepartment: (departmentCode, forceRefresh = false) => {
    const params = departmentCode ? { department: departmentCode } : {};
    if (forceRefresh) {
      clearApiCache('/auth/courses/');
    }
    return cachedGet('/auth/courses/', { params }, 5 * 60 * 1000);
  },

  // Get total student count (available to all authenticated users)
  getStudentCount: () => {
    return api.get('/auth/student-count/');
  },

  // Get total registered user count (staff/admin only)
  getUserCount: () => {
    return api.get('/auth/user-count/');
  },

  // Paginated user profiles (admin/staff list; supports page, page_size, role, search, filters)
  getAllProfiles: (params = {}) => {
    return api.get('/auth/profiles/', { params });
  },

  // Unified directory: students or staff/admin (admin/staff only)
  getDirectory: (params = {}) => {
    return api.get('/auth/directory/', { params });
  },

  // Get specific user profile
  getUserProfile: (profileId) => {
    return api.get(`/auth/profiles/${profileId}/`);
  },

  // Update another user's profile (staff/admin; staff scoped by year level on server)
  updateUserProfile: (profileId, data) => {
    const config = {};
    if (data instanceof FormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data',
      };
    }
    return api.patch(`/auth/profiles/${profileId}/`, data, config);
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

  // Update user role (admin only)
  updateUserRole: (profileId, role) => {
    return api.post(`/auth/profiles/${profileId}/update_role/`, {
      role: role
    });
  },

  // Set student verification flag (staff/admin only; audited on server)
  setUserVerified: (profileId, isVerified) => {
    return api.post(`/auth/profiles/${profileId}/set_verified/`, {
      is_verified: isVerified,
    });
  },

  // Logout helper (clears local storage)
  logout: () => {
    localStorage.clear();
  }
};

export default authService;


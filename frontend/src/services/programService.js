/**
 * Program Service
 * Handles all program (department/course) related API calls
 */

import api, { cachedGet, clearApiCache } from './api';

export const programService = {
  // === Programs ===
  
  // Get all programs
  getAll: (params = {}) => {
    return api.get('/auth/programs/', { params });
  },

  // Get program by ID
  getById: (id) => {
    return api.get(`/auth/programs/${id}/`);
  },

  // Get departments only (cached 5 minutes)
  getDepartments: (forceRefresh = false) => {
    if (forceRefresh) {
      clearApiCache('/auth/departments/');
    }
    return cachedGet('/auth/departments/', {}, 5 * 60 * 1000);
  },

  // Get courses only (cached 5 minutes)
  getCourses: (departmentCode = null, forceRefresh = false) => {
    const params = departmentCode ? { department: departmentCode } : {};
    if (forceRefresh) {
      clearApiCache('/auth/courses/');
    }
    return cachedGet('/auth/courses/', { params }, 5 * 60 * 1000);
  },

  // Create program
  create: async (programData) => {
    const response = await api.post('/auth/programs/', programData);
    clearApiCache('/auth/departments/');
    clearApiCache('/auth/courses/');
    return response;
  },

  // Update program
  update: async (id, programData) => {
    const response = await api.put(`/auth/programs/${id}/`, programData);
    clearApiCache('/auth/departments/');
    clearApiCache('/auth/courses/');
    return response;
  },

  // Delete program
  delete: async (id) => {
    const response = await api.delete(`/auth/programs/${id}/`);
    clearApiCache('/auth/departments/');
    clearApiCache('/auth/courses/');
    return response;
  },

  // Import programs from CSV (supports preview-only validation mode)
  importCSV: async (file, options = {}) => {
    const { previewOnly = false } = options;
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/auth/programs/import-csv/', formData, {
      params: {
        preview_only: previewOnly,
      },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!previewOnly) {
      clearApiCache('/auth/departments/');
      clearApiCache('/auth/courses/');
    }
    return response;
  },

  // Export programs to CSV
  exportCSV: (programType = null) => {
    const params = programType ? { program_type: programType } : {};
    return api.get('/auth/programs/export-csv/', {
      params,
      responseType: 'blob',
    });
  },
};

export default programService;


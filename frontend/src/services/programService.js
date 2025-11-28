/**
 * Program Service
 * Handles all program (department/course) related API calls
 */

import api from './api';

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

  // Get departments only
  getDepartments: () => {
    return api.get('/auth/departments/');
  },

  // Get courses only
  getCourses: (departmentId = null) => {
    const params = departmentId ? { department: departmentId } : {};
    return api.get('/auth/courses/', { params });
  },

  // Create program
  create: (programData) => {
    return api.post('/auth/programs/', programData);
  },

  // Update program
  update: (id, programData) => {
    return api.put(`/auth/programs/${id}/`, programData);
  },

  // Delete program
  delete: (id) => {
    return api.delete(`/auth/programs/${id}/`);
  },

  // Import programs from CSV
  importCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/auth/programs/import-csv/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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


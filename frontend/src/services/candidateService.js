/**
 * Candidate Service
 * Handles all candidate and application-related API calls
 */

import api from './api';

export const candidateService = {
  // === Candidates ===
  
  // Get all approved candidates
  getAll: () => {
    return api.get('/candidates/candidates/');
  },

  // Get candidate by ID
  getById: (id) => {
    return api.get(`/candidates/candidates/${id}/`);
  },

  // Get candidates by election
  getByElection: (electionId) => {
    return api.get(`/candidates/candidates/by_election/?election_id=${electionId}`);
  },

  // === Applications ===
  
  // Get all applications (filtered by permissions)
  getAllApplications: () => {
    return api.get('/candidates/applications/');
  },

  // Get application by ID
  getApplicationById: (id) => {
    return api.get(`/candidates/applications/${id}/`);
  },

  // Get current user's applications
  getMyApplications: () => {
    return api.get('/candidates/applications/my_applications/');
  },

  // Get pending applications (admin only)
  getPendingApplications: () => {
    return api.get('/candidates/applications/pending/');
  },

  // Submit new application
  submitApplication: (applicationData) => {
    // Use FormData for file uploads (photo)
    const formData = new FormData();
    Object.keys(applicationData).forEach(key => {
      if (applicationData[key] !== null && applicationData[key] !== undefined) {
        formData.append(key, applicationData[key]);
      }
    });
    return api.post('/candidates/applications/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Update application
  updateApplication: (id, applicationData) => {
    const formData = new FormData();
    Object.keys(applicationData).forEach(key => {
      if (applicationData[key] !== null && applicationData[key] !== undefined) {
        formData.append(key, applicationData[key]);
      }
    });
    return api.patch(`/candidates/applications/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Review application (admin only)
  reviewApplication: (id, reviewData) => {
    return api.post(`/candidates/applications/${id}/review/`, reviewData);
  },

  // Bulk review applications (admin only)
  bulkReview: (applicationIds, status, reviewNotes = '') => {
    return api.post('/candidates/applications/bulk_review/', {
      application_ids: applicationIds,
      status: status,
      review_notes: reviewNotes
    });
  },

  // Withdraw application (user own application)
  withdrawApplication: (id) => {
    return api.post(`/candidates/applications/${id}/withdraw/`);
  }
};

export default candidateService;


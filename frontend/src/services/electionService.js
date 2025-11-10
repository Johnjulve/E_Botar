/**
 * Election Service
 * Handles all election-related API calls
 */

import api from './api';

export const electionService = {
  // === Elections ===
  
  // Get all elections
  getAll: () => {
    return api.get('/elections/elections/');
  },

  // Get election by ID
  getById: (id) => {
    return api.get(`/elections/elections/${id}/`);
  },

  // Get active elections
  getActive: () => {
    return api.get('/elections/elections/active/');
  },

  // Get upcoming elections
  getUpcoming: () => {
    return api.get('/elections/elections/upcoming/');
  },

  // Get finished elections
  getFinished: () => {
    return api.get('/elections/elections/finished/');
  },

  // Create election (admin only)
  create: (electionData) => {
    return api.post('/elections/elections/', electionData);
  },

  // Update election (admin only)
  update: (id, electionData) => {
    return api.put(`/elections/elections/${id}/`, electionData);
  },

  // Delete election (admin only)
  delete: (id) => {
    return api.delete(`/elections/elections/${id}/`);
  },

  // Add position to election (admin only)
  addPosition: (electionId, positionData) => {
    return api.post(`/elections/elections/${electionId}/add_position/`, positionData);
  },

  // Remove position from election (admin only)
  removePosition: (electionId, positionId) => {
    return api.post(`/elections/elections/${electionId}/remove_position/`, { 
      position_id: positionId 
    });
  },

  // Auto-reject pending applications (admin only)
  rejectPendingApplications: (electionId) => {
    return api.post(`/elections/elections/${electionId}/reject_pending_applications/`);
  },

  // === Positions ===
  
  // Get all positions
  getAllPositions: () => {
    return api.get('/elections/positions/');
  },

  // Get position by ID
  getPositionById: (id) => {
    return api.get(`/elections/positions/${id}/`);
  },

  // Create position (admin only)
  createPosition: (positionData) => {
    return api.post('/elections/positions/', positionData);
  },

  // Update position (admin only)
  updatePosition: (id, positionData) => {
    return api.put(`/elections/positions/${id}/`, positionData);
  },

  // Delete position (admin only)
  deletePosition: (id) => {
    return api.delete(`/elections/positions/${id}/`);
  },

  // === Parties ===
  
  // Get all parties
  getAllParties: () => {
    return api.get('/elections/parties/');
  },

  // Get party by ID
  getPartyById: (id) => {
    return api.get(`/elections/parties/${id}/`);
  },

  // Create party (admin only)
  createParty: (partyData) => {
    return api.post('/elections/parties/', partyData);
  },

  // Update party (admin only)
  updateParty: (id, partyData) => {
    return api.put(`/elections/parties/${id}/`, partyData);
  },

  // Delete party (admin only)
  deleteParty: (id) => {
    return api.delete(`/elections/parties/${id}/`);
  }
};

export default electionService;


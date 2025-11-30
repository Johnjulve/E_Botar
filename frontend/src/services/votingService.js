/**
 * Voting Service
 * Handles all voting and ballot-related API calls
 */

import api from './api';

export const votingService = {
  // === Ballots ===
  
  // Get user's ballots
  getMyBallots: () => {
    return api.get('/voting/ballots/');
  },

  // Get ballot for specific election
  getMyBallot: (electionId) => {
    return api.get(`/voting/ballots/my_ballot/?election_id=${electionId}`);
  },

  // Submit ballot
  submitBallot: (ballotData) => {
    return api.post('/voting/ballots/submit/', ballotData);
  },

  // === Vote Receipts ===
  
  // Get user's receipts
  getMyReceipts: () => {
    return api.get('/voting/receipts/my_receipts/');
  },

  // Verify receipt
  verifyReceipt: (receiptCode) => {
    return api.post('/voting/receipts/verify/', {
      receipt_code: receiptCode
    });
  },

  // Get votes by receipt code (requires authentication)
  getVotesByReceipt: (receiptCode) => {
    return api.post('/voting/receipts/get_votes/', {
      receipt_code: receiptCode
    });
  },

  // === Vote Status ===
  
  // Check if user has voted in election
  getVoteStatus: (electionId) => {
    return api.get(`/voting/results/my_vote_status/?election_id=${electionId}`);
  },

  // === Results ===
  
  // Get election results
  getElectionResults: (electionId) => {
    return api.get(`/voting/results/election_results/?election_id=${electionId}`);
  },

  // Get election statistics
  getStatistics: (electionId) => {
    return api.get(`/voting/results/statistics/?election_id=${electionId}`);
  },

  // Export results (admin only)
  exportResults: (electionId, format = 'csv') => {
    return api.get(`/voting/results/export_results/?election_id=${electionId}&format=${format}`, {
      responseType: 'blob' // Important for file downloads
    });
  },

  // Helper: Download exported file
  downloadExport: async function(electionId, format = 'csv') {
    try {
      const response = await this.exportResults(electionId, format);
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `election_results_${electionId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Export download failed:', error);
      throw error;
    }
  }
};

export default votingService;


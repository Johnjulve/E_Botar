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

  // Get per-election voting status for all students (staff/admin only)
  getVotingStatus: (params = {}) => {
    return api.get('/voting/voting-status/', { params });
  },

  // Get receipt audit rows (staff/admin only)
  getReceiptAudit: (params = {}) => {
    return api.get('/voting/receipts/audit/', { params });
  },

  // Reveal full receipt code for audit row (staff/admin only)
  revealReceiptCode: (receiptId) => {
    return api.post('/voting/receipts/reveal_receipt/', {
      receipt_id: receiptId
    });
  },

  // === Results ===
  
  // Get election results
  getElectionResults: (electionId) => {
    return api.get(`/voting/results/election_results/?election_id=${electionId}`);
  },

  // Aggregated breakdown for the data-export page (staff/admin only).
  // Replaces the previous client-side aggregation that pulled every ballot
  // to the browser. Returns counts grouped by candidate × dept × course ×
  // year_level plus a per-bucket student roster — never per-user choices.
  getResultsBreakdown: (electionId) => {
    return api.get(`/voting/results/breakdown/?election_id=${electionId}`);
  },

  // Per-student voting status for a single (election, dept, course) drill.
  // The only path that ever returns individual names to staff/admin in the
  // export flow — the response carries name/section/year_level/has_voted
  // and never vote choices. Each call is audit-logged on the backend.
  getStudentRoster: (electionId, departmentCode, courseCode) => {
    const params = new URLSearchParams({
      election_id: electionId,
      department_code: departmentCode,
      course_code: courseCode,
    });
    return api.get(`/voting/results/student_roster/?${params.toString()}`);
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
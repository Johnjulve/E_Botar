import api from './api';

/** Default branding when API is unavailable (template fallback) */
export const DEFAULT_BRANDING = {
  institution_name: 'SURIGAO DEL NORTE',
  institution_name_line2: 'STATE UNIVERSITY',
  institution_logo_url: null,
  app_name: 'E-Botar',
  institution_full_name: 'SURIGAO DEL NORTE STATE UNIVERSITY'
};

/**
 * System Service - Handles system-wide settings and configurations
 */
const systemService = {
  /**
   * Get institution branding (public, no auth required)
   * @returns {Promise<{institution_name, institution_name_line2, institution_logo_url, app_name, institution_full_name}>}
   */
  async getBranding() {
    try {
      const response = await api.get('/common/branding/');
      return response.data;
    } catch (error) {
      console.error('Error fetching branding:', error);
      return DEFAULT_BRANDING;
    }
  },

  /**
   * Get current academic year
   * @returns {Promise<{academic_year: string, display: string}>}
   */
  async getAcademicYear() {
    try {
      const response = await api.get('/common/academic-year/');
      return response.data;
    } catch (error) {
      console.error('Error fetching academic year:', error);
      // Return default if API fails
      return {
        academic_year: '2025-2026',
        display: 'A.Y 2025-2026'
      };
    }
  },

  /**
   * Update academic year (admin only)
   * @param {string} academicYear - Academic year in format YYYY-YYYY (e.g., "2025-2026")
   * @returns {Promise<{academic_year: string, display: string, message: string}>}
   */
  async updateAcademicYear(academicYear) {
    try {
      const response = await api.put('/common/academic-year/', {
        academic_year: academicYear
      });
      return response.data;
    } catch (error) {
      console.error('Error updating academic year:', error);
      throw error;
    }
  },

  /**
   * Generate academic year options: a short list from 2 years ago to 5 years ahead (8 options total).
   * Keeps the dropdown manageable while covering current and near-future A.Y.
   * @returns {Array<string>} Array of academic year strings
   */
  generateAcademicYearOptions() {
    const currentYear = new Date().getFullYear();
    const options = [];
    const yearsBack = 2;
    const yearsAhead = 5;

    for (let i = -yearsBack; i <= yearsAhead; i++) {
      const year1 = currentYear + i;
      const year2 = year1 + 1;
      options.push(`${year1}-${year2}`);
    }

    return options;
  }
};

export default systemService;


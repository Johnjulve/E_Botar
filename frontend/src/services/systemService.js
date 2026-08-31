import api, { cachedGet, clearApiCache } from './api';

/** Default branding when API is unavailable (template fallback) */
export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  data_export: true,
  user_registration: true,
  google_login: true,
  staff_preview_disabled_features: true,
});

export const DEFAULT_BRANDING = Object.freeze({
  institution_name: 'SURIGAO DEL NORTE',
  institution_name_line2: 'STATE UNIVERSITY',
  institution_logo_url: null,
  app_name: 'E-Botar',
  institution_full_name: 'SURIGAO DEL NORTE STATE UNIVERSITY',
  feature_flags: DEFAULT_FEATURE_FLAGS,
});

/**
 * System Service - Handles system-wide settings and configurations
 */
const systemService = {
  /**
   * Get institution branding (public, no auth required - cached 5 minutes)
   * @param {boolean} forceRefresh - If true, bypasses client cache
   * @returns {Promise<{institution_name, institution_name_line2, institution_logo_url, app_name, institution_full_name}>}
   */
  async getBranding(forceRefresh = false) {
    try {
      if (forceRefresh) {
        clearApiCache('/common/branding/');
      }
      const response = await cachedGet('/common/branding/', {}, 5 * 60 * 1000);
      const data = response.data || {};
      return {
        ...DEFAULT_BRANDING,
        ...data,
        feature_flags: {
          ...DEFAULT_FEATURE_FLAGS,
          ...(data.feature_flags || {}),
        },
      };
    } catch (error) {
      console.error('Error fetching branding:', error);
      return { ...DEFAULT_BRANDING };
    }
  },

  /** Superuser PATCH for temporary feature disables (stored in backend SystemSettings). */
  async patchFeatureFlags(partialFlagPayload) {
    const response = await api.patch('/common/feature-flags/', partialFlagPayload);
    clearApiCache('/common/branding/');
    return response.data;
  },

  /**
   * Get current academic year (cached 5 minutes)
   * @param {boolean} forceRefresh - If true, bypasses client cache
   * @returns {Promise<{academic_year: string, display: string}>}
   */
  async getAcademicYear(forceRefresh = false) {
    try {
      if (forceRefresh) {
        clearApiCache('/common/academic-year/');
      }
      const response = await cachedGet('/common/academic-year/', {}, 5 * 60 * 1000);
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
      clearApiCache('/common/academic-year/');
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


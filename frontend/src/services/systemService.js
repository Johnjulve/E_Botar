import api, { cachedGet, clearApiCache } from './api';

/** Default branding when API is unavailable (template fallback) */
export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  data_export: true,
  user_registration: false,
  google_login: true,
  staff_preview_disabled_features: true,
});


export const DEFAULT_BRANDING = Object.freeze({
  institution_name: 'E-Botar',
  institution_name_line2: '',
  institution_acronym: 'EB',
  app_name: 'E-Botar',
  tagline: 'Blockchain-Inspired Electronic Voting Platform',
  support_email: '',
  website_url: '',
  primary_color: '#0b6e3b',
  secondary_color: '#f4cc5c',
  institution_logo_url: null,
  institution_favicon_url: null,
  institution_seal_url: null,
  institution_logo: '',
  institution_favicon: '',
  institution_seal: '',
  is_custom_branded: false,
  institution_full_name: 'E-Botar',
  feature_flags: DEFAULT_FEATURE_FLAGS,
});

/**
 * System Service - Handles system-wide settings and configurations
 */
const systemService = {
  /**
   * Get institution branding (public, no auth required - cached 5 minutes)
   * @param {boolean} forceRefresh - If true, bypasses client cache
   * @returns {Promise<typeof DEFAULT_BRANDING>}
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

  /** Superuser PATCH for institutional branding configuration and color tokens. */
  async updateBranding(payload) {
    const response = await api.patch('/common/branding/', payload);
    clearApiCache('/common/branding/');
    return response.data;
  },

  /** Superuser multipart file upload for brand assets (logo, favicon, seal). */
  async uploadBrandingAsset(file, assetType = 'logo') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    const response = await api.post('/common/branding/upload-asset/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    clearApiCache('/common/branding/');
    return response.data;
  },

  /** Superuser endpoint restoring canonical E-Botar brand identity and default colors. */
  async resetBrandingToDefaults() {
    const response = await api.post('/common/branding/reset-defaults/');
    clearApiCache('/common/branding/');
    return response.data;
  },

  /**
   * Get all available uploaded brand assets in the library.
   * @returns {Promise<Array<{id: string, name: string, path: string, url: string, size: number, asset_type: string, created_at: string, is_active: boolean}>>}
   */
  async getBrandingAssets() {
    try {
      const response = await api.get('/common/branding/assets/');
      return response.data?.assets || [];
    } catch (error) {
      console.error('Error fetching branding assets:', error);
      return [];
    }
  },

  /**
   * Activate an existing uploaded brand asset by ID (avoids duplicate uploads).
   * @param {string} assetId
   */
  async activateBrandingAsset(assetId) {
    const response = await api.post(`/common/branding/assets/${encodeURIComponent(assetId)}/activate/`);
    clearApiCache('/common/branding/');
    return response.data;
  },

  /**
   * Permanently delete an uploaded brand asset by ID.
   * @param {string} assetId
   */
  async deleteBrandingAsset(assetId) {
    const response = await api.delete(`/common/branding/assets/${encodeURIComponent(assetId)}/`);
    clearApiCache('/common/branding/');
    return response.data;
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


/**
 * BrandingContext - Institution branding + public feature availability flags.
 */

import React, { useState, useEffect, useCallback } from 'react';
import systemService, { DEFAULT_BRANDING, DEFAULT_FEATURE_FLAGS } from '../services/systemService';
import BrandingContext from './BrandingContextObject';

function mapBrandingFromApi(data = {}) {
  return {
    institution_name: data.institution_name ?? DEFAULT_BRANDING.institution_name,
    institution_name_line2: data.institution_name_line2 ?? DEFAULT_BRANDING.institution_name_line2,
    institution_logo_url: data.institution_logo_url ?? null,
    app_name: data.app_name ?? DEFAULT_BRANDING.app_name,
    institution_full_name: data.institution_full_name ?? DEFAULT_BRANDING.institution_full_name,
    feature_flags: {
      ...DEFAULT_FEATURE_FLAGS,
      ...(data.feature_flags || {}),
    },
  };
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() =>
    mapBrandingFromApi({ ...DEFAULT_BRANDING, feature_flags: DEFAULT_FEATURE_FLAGS })
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshBranding = useCallback(async () => {
    setLoading(true);
    try {
      const data = await systemService.getBranding();
      setBranding(mapBrandingFromApi(data));
      setError(null);
    } catch (err) {
      setBranding(mapBrandingFromApi(DEFAULT_BRANDING));
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const value = {
    ...branding,
    loading,
    error,
    refreshBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

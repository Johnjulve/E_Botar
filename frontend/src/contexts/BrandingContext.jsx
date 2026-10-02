import React, { useState, useEffect, useCallback } from 'react';
import systemService, { DEFAULT_BRANDING, DEFAULT_FEATURE_FLAGS } from '../services/systemService';
import { applyThemeToDocument } from '../utils/themeEngine';
import BrandingContext from './BrandingContextObject';

function mapBrandingFromApi(data = {}) {
  const instName = data.institution_name ?? DEFAULT_BRANDING.institution_name;
  const instLine2 = data.institution_name_line2 ?? DEFAULT_BRANDING.institution_name_line2;
  const fullName = data.institution_full_name ?? `${instName} ${instLine2}`.trim();

  return {
    ...DEFAULT_BRANDING,
    ...data,
    institution_name: instName,
    institution_name_line2: instLine2,
    institution_full_name: fullName,
    institution_acronym: data.institution_acronym ?? DEFAULT_BRANDING.institution_acronym,
    app_name: data.app_name ?? DEFAULT_BRANDING.app_name,
    tagline: data.tagline ?? DEFAULT_BRANDING.tagline,
    support_email: data.support_email ?? DEFAULT_BRANDING.support_email,
    website_url: data.website_url ?? DEFAULT_BRANDING.website_url,
    primary_color: data.primary_color ?? DEFAULT_BRANDING.primary_color,
    secondary_color: data.secondary_color ?? DEFAULT_BRANDING.secondary_color,
    institution_logo_url: data.institution_logo_url ?? null,
    institution_favicon_url: data.institution_favicon_url ?? null,
    institution_seal_url: data.institution_seal_url ?? null,
    is_custom_branded: Boolean(data.is_custom_branded),
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

  // Apply theme tokens immediately on mount and when branding updates
  useEffect(() => {
    applyThemeToDocument(branding);
  }, [branding]);

  const refreshBranding = useCallback(async (bypassCache = true) => {
    setLoading(true);
    try {
      const data = await systemService.getBranding(bypassCache);
      const mapped = mapBrandingFromApi(data);
      setBranding(mapped);
      applyThemeToDocument(mapped);
      setError(null);
      return mapped;
    } catch (err) {
      const fallback = mapBrandingFromApi(DEFAULT_BRANDING);
      setBranding(fallback);
      applyThemeToDocument(fallback);
      setError(err);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding(false);
  }, [refreshBranding]);

  const applyPreviewTheme = useCallback((draftTheme) => {
    applyThemeToDocument({
      ...branding,
      ...draftTheme,
    });
  }, [branding]);

  const revertPreviewTheme = useCallback(() => {
    applyThemeToDocument(branding);
  }, [branding]);

  const value = {
    ...branding,
    loading,
    error,
    refreshBranding,
    applyPreviewTheme,
    revertPreviewTheme,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}


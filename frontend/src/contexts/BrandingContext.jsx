/**
 * BrandingContext - Institution/school branding (logo, name) for template reuse.
 * Fetches from API so other schools can deploy with their own branding.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import systemService, { DEFAULT_BRANDING } from '../services/systemService';

const BrandingContext = createContext({
  ...DEFAULT_BRANDING,
  loading: true,
  error: null
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    systemService.getBranding()
      .then((data) => {
        if (!cancelled) {
          setBranding({
            institution_name: data.institution_name ?? DEFAULT_BRANDING.institution_name,
            institution_name_line2: data.institution_name_line2 ?? DEFAULT_BRANDING.institution_name_line2,
            institution_logo_url: data.institution_logo_url ?? null,
            app_name: data.app_name ?? DEFAULT_BRANDING.app_name,
            institution_full_name: data.institution_full_name ?? DEFAULT_BRANDING.institution_full_name
          });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBranding(DEFAULT_BRANDING);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const value = {
    ...branding,
    loading,
    error
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

export default BrandingContext;

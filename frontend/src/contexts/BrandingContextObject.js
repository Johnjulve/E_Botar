import { createContext } from 'react';
import { DEFAULT_BRANDING } from '../services/systemService';

const BrandingContext = createContext({
  ...DEFAULT_BRANDING,
  loading: true,
  error: null,
  refreshBranding: async () => {},
});

export default BrandingContext;

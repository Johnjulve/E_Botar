import { useContext } from 'react';
import BrandingContext from '../contexts/BrandingContextObject';

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export default useBranding;

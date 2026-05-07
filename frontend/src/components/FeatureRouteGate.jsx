/**
 * Blocks routes when backend feature_flags turn off surfaces (guests/staff).
 * Superusers bypass so maintenance controls stay reachable.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../hooks/useBranding';

const FeatureRouteGate = ({
  children,
  requireAny = [],
  requireAll = [],
  redirectTo = '/',
}) => {
  const { loading: authLoading, isAdmin } = useAuth();
  const { feature_flags: featureFlags, loading: brandingLoading } = useBranding();

  if (authLoading || brandingLoading) {
    return <LoadingSpinner fullScreen text="Loading…" />;
  }

  if (isAdmin) {
    return children;
  }

  const allowsAny = requireAny.length === 0
    || requireAny.some((key) => featureFlags[key] !== false);

  const allowsAll = requireAll.length === 0
    || requireAll.every((key) => featureFlags[key] !== false);

  if (allowsAny && allowsAll) {
    return children;
  }

  return <Navigate to={redirectTo} replace />;
};

export default FeatureRouteGate;

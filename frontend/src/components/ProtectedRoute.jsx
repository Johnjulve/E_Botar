/**
 * ProtectedRoute Component
 * Route wrapper that requires authentication
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './common/LoadingSpinner';

const ProtectedRoute = ({ children, requireAdmin = false, requireStaff = false }) => {
  const { isAuthenticated, isAdmin, isStaffOrAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only routes (superuser only)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Staff routes (staff or admin can access)
  if (requireStaff && !isStaffOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

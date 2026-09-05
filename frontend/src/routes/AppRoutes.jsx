/**
 * App Routes
 * Central routing configuration with route-level code splitting
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import FeatureRouteGate from '../components/FeatureRouteGate';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Auth Pages (Lazy)
const LoginPage = lazy(() => import('../modules/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../modules/auth/pages/RegisterPage'));

// Election Pages (Lazy)
const ElectionListPage = lazy(() => import('../modules/elections/pages/ElectionListPage'));
const ElectionDetailsPage = lazy(() => import('../modules/elections/pages/ElectionDetailsPage'));

// Candidate Pages (Lazy)
const CandidateListPage = lazy(() => import('../modules/candidates/pages/CandidateListPage'));
const CandidateProfilePage = lazy(() => import('../modules/candidates/pages/CandidateProfilePage'));
const ApplicationFormPage = lazy(() => import('../modules/candidates/pages/ApplicationFormPage'));
const MyApplicationsPage = lazy(() => import('../modules/candidates/pages/MyApplicationsPage'));

// Voting Pages (Lazy)
const VotingPage = lazy(() => import('../modules/voting/pages/VotingPage'));
const MyVotesPage = lazy(() => import('../modules/voting/pages/MyVotesPage'));
const VerifyReceiptPage = lazy(() => import('../modules/voting/pages/VerifyReceiptPage'));

// Results Pages (Lazy)
const ResultsDetailsPage = lazy(() => import('../modules/results/pages/ResultsDetailsPage'));

// Profile Pages (Lazy)
const ProfilePage = lazy(() => import('../modules/profile/pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('../modules/profile/pages/ProfileEditPage'));
const DashboardPage = lazy(() => import('../modules/profile/pages/DashboardPage'));

// Admin Pages (Lazy)
const AdminDashboardPage = lazy(() => import('../modules/admin/pages/AdminDashboardPage'));
const ElectionManagementPage = lazy(() => import('../modules/admin/pages/ElectionManagementPage'));
const ElectionFormPage = lazy(() => import('../modules/admin/pages/ElectionFormPage'));
const ApplicationReviewPage = lazy(() => import('../modules/admin/pages/ApplicationReviewPage'));
const ApplicationsListPage = lazy(() => import('../modules/admin/pages/ApplicationsListPage'));
const UserManagementPage = lazy(() => import('../modules/admin/pages/UserManagementPage'));
const SystemLogsPage = lazy(() => import('../modules/admin/pages/SystemLogsPage'));
const ProgramManagementPage = lazy(() => import('../modules/admin/pages/ProgramManagementPage'));
const PartyManagementPage = lazy(() => import('../modules/admin/pages/PartyManagementPage'));
const PositionManagementPage = lazy(() => import('../modules/admin/pages/PositionManagementPage'));
const DataExportPage = lazy(() => import('../modules/admin/pages/DataExportPage'));
const UserDirectoryPage = lazy(() => import('../modules/admin/pages/UserDirectoryPage'));
const VotingStatusPage = lazy(() => import('../modules/admin/pages/VotingStatusPage'));
const ReceiptAuditPage = lazy(() => import('../modules/admin/pages/ReceiptAuditPage'));
const MaintenanceFeaturesPage = lazy(() => import('../modules/admin/pages/MaintenanceFeaturesPage'));
const BrandingSettingsPage = lazy(() => import('../modules/admin/pages/BrandingSettingsPage'));


const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/register"
          element={
            <FeatureRouteGate requireAll={['user_registration']}>
              <RegisterPage />
            </FeatureRouteGate>
          }
        />

        {/* Public Home/Dashboard - Accessible to all */}
        <Route path="/" element={<DashboardPage />} />

        {/* Public Elections - Accessible to all */}
        <Route path="/elections" element={<ElectionListPage />} />
        <Route path="/elections/:id" element={<ElectionDetailsPage />} />

        {/* Public Candidates - Accessible to all */}
        <Route path="/candidates" element={<CandidateListPage />} />
        <Route path="/candidates/:id" element={<CandidateProfilePage />} />

        {/* Protected Routes - Candidate Application */}
        <Route 
          path="/apply" 
          element={
            <ProtectedRoute>
              <ApplicationFormPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-applications" 
          element={
            <ProtectedRoute>
              <MyApplicationsPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes - Voting */}
        <Route 
          path="/vote/:id" 
          element={
            <ProtectedRoute>
              <VotingPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-votes" 
          element={
            <ProtectedRoute>
              <MyVotesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/verify-receipt" 
          element={
            <ProtectedRoute>
              <VerifyReceiptPage />
            </ProtectedRoute>
          } 
        />

        {/* Public Routes - Results (Accessible to all) */}
        <Route path="/results/:id" element={<ResultsDetailsPage />} />

        {/* Protected Routes - Profile */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/edit" 
          element={
            <ProtectedRoute>
              <ProfileEditPage />
            </ProtectedRoute>
          } 
        />

        {/* Admin/Staff Routes - Staff can access dashboard, elections, and applications */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireStaff>
              <AdminDashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/elections" 
          element={
            <ProtectedRoute requireStaff>
              <ElectionManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/elections/create" 
          element={
            <ProtectedRoute requireStaff>
              <ElectionFormPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/elections/:id/edit" 
          element={
            <ProtectedRoute requireStaff>
              <ElectionFormPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/applications" 
          element={
            <ProtectedRoute requireStaff>
              <ApplicationsListPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/applications/:id" 
          element={
            <ProtectedRoute requireStaff>
              <ApplicationReviewPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/voting-status" 
          element={
            <ProtectedRoute requireStaff>
              <VotingStatusPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/admin/receipt-audit"
          element={
            <ProtectedRoute requireStaff>
              <ReceiptAuditPage />
            </ProtectedRoute>
          }
        />
        {/* Admin-only Routes - Only superusers can access */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute requireStaff>
              <UserManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/logs" 
          element={
            <ProtectedRoute requireAdmin>
              <SystemLogsPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/admin/maintenance/features"
          element={
            <ProtectedRoute requireAdmin>
              <MaintenanceFeaturesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branding"
          element={
            <ProtectedRoute requireAdmin>
              <BrandingSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/admin/programs" 
          element={
            <ProtectedRoute requireAdmin>
              <ProgramManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/parties" 
          element={
            <ProtectedRoute requireAdmin>
              <PartyManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/positions" 
          element={
            <ProtectedRoute requireAdmin>
              <PositionManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/data-export" 
          element={
            <ProtectedRoute requireStaff>
              <FeatureRouteGate requireAll={['data_export']}>
                <DataExportPage />
              </FeatureRouteGate>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;



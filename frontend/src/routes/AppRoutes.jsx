/**
 * App Routes
 * Central routing configuration for the application
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Auth Pages
import LoginPage from '../modules/auth/pages/LoginPage';
import RegisterPage from '../modules/auth/pages/RegisterPage';

// Election Pages
import ElectionListPage from '../modules/elections/pages/ElectionListPage';
import ElectionDetailsPage from '../modules/elections/pages/ElectionDetailsPage';

// Candidate Pages
import CandidateListPage from '../modules/candidates/pages/CandidateListPage';
import CandidateProfilePage from '../modules/candidates/pages/CandidateProfilePage';
import ApplicationFormPage from '../modules/candidates/pages/ApplicationFormPage';
import MyApplicationsPage from '../modules/candidates/pages/MyApplicationsPage';

// Voting Pages
import VotingPage from '../modules/voting/pages/VotingPage';
import MyVotesPage from '../modules/voting/pages/MyVotesPage';
import VerifyReceiptPage from '../modules/voting/pages/VerifyReceiptPage';

// Results Pages
import ResultsDetailsPage from '../modules/results/pages/ResultsDetailsPage';

// Profile Pages
import ProfilePage from '../modules/profile/pages/ProfilePage';
import ProfileEditPage from '../modules/profile/pages/ProfileEditPage';
import DashboardPage from '../modules/profile/pages/DashboardPage';

// Admin Pages
import AdminDashboardPage from '../modules/admin/pages/AdminDashboardPage';
import ElectionManagementPage from '../modules/admin/pages/ElectionManagementPage';
import ElectionFormPage from '../modules/admin/pages/ElectionFormPage';
import ApplicationReviewPage from '../modules/admin/pages/ApplicationReviewPage';
import ApplicationsListPage from '../modules/admin/pages/ApplicationsListPage';
import UserManagementPage from '../modules/admin/pages/UserManagementPage';
import SystemLogsPage from '../modules/admin/pages/SystemLogsPage';
import ProgramManagementPage from '../modules/admin/pages/ProgramManagementPage';
import PartyManagementPage from '../modules/admin/pages/PartyManagementPage';
import PositionManagementPage from '../modules/admin/pages/PositionManagementPage';
import DataExportPage from '../modules/admin/pages/DataExportPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
      {/* Admin-only Routes - Only superusers can access */}
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute requireAdmin>
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
        path="/admin/programs" 
        element={
          <ProtectedRoute requireStaff>
            <ProgramManagementPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/parties" 
        element={
          <ProtectedRoute requireStaff>
            <PartyManagementPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/positions" 
        element={
          <ProtectedRoute requireStaff>
            <PositionManagementPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/data-export" 
        element={
          <ProtectedRoute requireStaff>
            <DataExportPage />
          </ProtectedRoute>
        } 
      />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;


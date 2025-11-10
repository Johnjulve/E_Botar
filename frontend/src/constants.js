/**
 * Application Constants
 * Central location for all app constants
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme'
};

// Election Status
export const ELECTION_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  FINISHED: 'finished'
};

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

// Position Types
export const POSITION_TYPES = {
  PRESIDENT: 'president',
  VICE_PRESIDENT: 'vice_president',
  SECRETARY: 'secretary',
  TREASURER: 'treasurer',
  AUDITOR: 'auditor',
  PUBLIC_INFO: 'public_info',
  OTHER: 'other'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student'
};

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png']
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
};

// Toast/Alert Duration
export const ALERT_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 3000,
  WARNING: 4000
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ELECTIONS: '/elections',
  ELECTION_DETAILS: '/elections/:id',
  CANDIDATES: '/candidates',
  CANDIDATE_PROFILE: '/candidates/:id',
  APPLY: '/apply',
  MY_APPLICATIONS: '/my-applications',
  VOTE: '/vote/:id',
  MY_VOTES: '/my-votes',
  RESULTS: '/results',
  RESULT_DETAILS: '/results/:id',
  PROFILE: '/profile',
  EDIT_PROFILE: '/profile/edit',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_ELECTIONS: '/admin/elections',
  ADMIN_APPLICATIONS: '/admin/applications',
  ADMIN_USERS: '/admin/users',
  ADMIN_LOGS: '/admin/logs'
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/token/',
  REGISTER: '/auth/register/',
  REFRESH_TOKEN: '/auth/token/refresh/',
  ME: '/auth/me/',
  DEPARTMENTS: '/auth/departments/',
  COURSES: '/auth/courses/',
  PROFILES: '/auth/profiles/',
  
  // Elections
  ELECTIONS: '/elections/elections/',
  ACTIVE_ELECTIONS: '/elections/elections/active/',
  UPCOMING_ELECTIONS: '/elections/elections/upcoming/',
  FINISHED_ELECTIONS: '/elections/elections/finished/',
  POSITIONS: '/elections/positions/',
  PARTIES: '/elections/parties/',
  
  // Candidates
  CANDIDATES: '/candidates/candidates/',
  CANDIDATES_BY_ELECTION: '/candidates/candidates/by_election/',
  APPLICATIONS: '/candidates/applications/',
  MY_APPLICATIONS: '/candidates/applications/my_applications/',
  PENDING_APPLICATIONS: '/candidates/applications/pending/',
  
  // Voting
  BALLOTS: '/voting/ballots/',
  SUBMIT_BALLOT: '/voting/ballots/submit/',
  RECEIPTS: '/voting/receipts/',
  MY_RECEIPTS: '/voting/receipts/my_receipts/',
  VERIFY_RECEIPT: '/voting/receipts/verify/',
  RESULTS: '/voting/results/election_results/',
  VOTE_STATUS: '/voting/results/my_vote_status/',
  STATISTICS: '/voting/results/statistics/',
  EXPORT_RESULTS: '/voting/results/export_results/'
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
};

export default {
  API_BASE_URL,
  STORAGE_KEYS,
  ELECTION_STATUS,
  APPLICATION_STATUS,
  POSITION_TYPES,
  USER_ROLES,
  FILE_LIMITS,
  PAGINATION,
  ALERT_DURATION,
  ROUTES,
  API_ENDPOINTS,
  HTTP_STATUS,
  ERROR_MESSAGES
};

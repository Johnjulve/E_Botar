# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.6.4] - 2025-11-25
### Fixed
- **Staff Access to Admin Panels**: Fixed issue where staff users could not see admin panels they're allowed to access. Staff can now properly access election management and application review interfaces.
- **Permission System**: Replaced Django's `IsAdminUser` (which checks `is_staff`) with custom permission classes to properly distinguish between staff and admin roles.
  - Created `IsSuperUser` permission class that checks `is_superuser` for admin-only operations
  - Created `IsStaffOrSuperUser` permission class for operations accessible to both staff and admins
  - Updated all views to use appropriate permission classes

- **Frontend Role Detection**: Fixed frontend to check `is_superuser` instead of `is_staff` for admin access, ensuring proper role-based UI rendering.

- **Sensitive Data Exposure**: Fixed issue where staff users could see sensitive fields (`is_staff`, `is_superuser`) of other users. These fields are now properly hidden from non-admin users.
- **Election Results Coverage**: Results API and UI now include every candidate (even with zero votes) for both active and completed elections.

### Changed
- **Backend Permission Classes**:
  - All admin-only endpoints now use `IsSuperUser` (requires `is_superuser=True`)
  - Staff-accessible endpoints use `IsStaffOrSuperUser` (allows both staff and admin)
  - Updated views in accounts, elections, candidates, and voting modules

- **Frontend Auth Context**:
  - `isAdmin()` now checks `is_superuser` instead of `is_staff`
  - Added `isStaff()` function to check staff status
  - Added `isStaffOrAdmin()` function for staff-accessible features

- **Protected Routes**:
  - Added `requireStaff` prop to `ProtectedRoute` component
  - Staff-accessible routes (dashboard, elections, applications) use `requireStaff`
  - Admin-only routes (user management, system logs) use `requireAdmin`

- **Navbar Menu**:
  - Shows "Admin" menu for staff and admins
  - Displays "Staff" label for staff users, "Admin" for superusers
  - Conditionally shows admin-only menu items (User Management, System Logs) only for superusers

- **User Serializer**:
  - Users can see their own `is_staff` and `is_superuser` fields (needed for frontend role checks)
  - Admins can see all users' sensitive fields
  - Non-admins viewing other users' profiles cannot see sensitive fields

### Technical Details
- Created `apps/common/permissions.py` with custom permission classes
- Updated all ViewSets and API views to use new permission classes
- Frontend routes properly distinguish between staff and admin access
- API responses now filter sensitive fields based on requester's role
- Staff users can access: Admin Dashboard, Election Management, Application Review
- Staff users cannot access: User Management, System Logs, Role Management, Password Reset

---

## [0.6.3] - 2025-11-25
### Added
- **Role-Based Access Control System**:
  - Implemented three-tier role system: Student, Staff, and Admin
  - Added role computation in UserSerializer based on `is_staff` and `is_superuser` flags
  - Created `update_role` API endpoint for role management (admin only)
  - Added role change logging in ActivityLog for audit trail
  - Role management prevents self-role changes for security

- **User Management Interface Enhancements**:
  - Added "Change Role" button in user management table actions
  - Created Role Management Modal with role selection dropdown
  - Added Staff filter tab and statistics display
  - Updated role badges to visually distinguish Admin, Staff, and Student roles
  - Added role permission descriptions in role change modal

### Changed
- **User Management Page**:
  - Updated filtering logic to distinguish Admin (`is_superuser`) from Staff (`is_staff` only)
  - Added Staff count in statistics dashboard
  - Updated role display to show three distinct roles with color-coded badges
  - Enhanced user table to include role management functionality

- **Backend Serializers**:
  - Added `role` computed field to UserSerializer
  - Role automatically determined: Admin (is_superuser), Staff (is_staff only), Student (neither)

- **API Endpoints**:
  - Added `POST /api/auth/profiles/{id}/update_role/` endpoint for role management
  - Endpoint validates role changes and prevents self-modification
  - Returns updated profile with new role information

### Technical Details
- Role system uses Django's built-in `is_staff` and `is_superuser` flags
- Admin role: `is_superuser=True`, `is_staff=True` (full access)
- Staff role: `is_staff=True`, `is_superuser=False` (limited admin access)
- Student role: `is_staff=False`, `is_superuser=False` (standard user)
- All role changes are logged in ActivityLog with metadata
- Frontend service method `updateUserRole()` added to authService

---

## [0.6.2] - 2025-11-25
### Changed
- **Candidate Application Restrictions**:
  - Enforced one application per user per election (regardless of position)
  - Changed unique constraint from `(user, position, election)` to `(user, election)`
  - Users must withdraw their existing application before applying for a different position in the same election
  - Updated validation logic in both model `clean()` method and serializer to check for existing active applications
  - Improved error messages to guide users on withdrawing existing applications

- **Frontend Application Form**:
  - Enhanced error handling to properly display validation errors from backend
  - Added support for field-specific errors (election field) and non-field errors
  - Improved error message extraction and display for better user experience

### Fixed
- Users can no longer submit multiple applications for different positions in the same election
- Database constraint now properly enforces one application per election at the database level
- Existing duplicate applications were automatically cleaned up during migration (kept most recent, marked others as withdrawn)

### Technical Details
- Created migration to clean up existing duplicate applications before applying new constraint
- Updated `CandidateApplication.clean()` to validate against any active application (pending/approved) in the same election
- Serializer validation now provides clear error messages when duplicate application is detected
- Migration process safely handles existing data by preserving the most recent application per user+election combination

---

## [0.6.1] - 2025-11-24
### Changed
- **Election Position Model**:
  - Removed `position_type` field from `SchoolPosition` model
  - Positions are now identified solely by their name and display order
  - Simplified position management without predefined type categories
  - Updated admin, serializers, and views to reflect removal of position_type

- **Program Model Structure**:
  - Replaced generic `parent` self-reference with explicit `department` foreign key
  - Course-type programs now directly reference their department via `department` field
  - Improved query clarity and admin interface for department-course relationships
  - Updated serializers and views to use `department_id` instead of `parent_id`

- **Registration System**:
  - Added email domain validation (snsu.edu.ph, ssct.edu.ph)
  - Fixed password confirmation field name (`password_confirm` instead of `password2`)
  - Added optional first_name and last_name fields to registration form
  - Enhanced frontend validation with domain-specific email checks
  - Improved error messaging for registration failures

- **Admin Privacy**:
  - Masked ballot identifiers in VoteChoice admin list view
  - Improved privacy protection for vote tracking in admin interface

### Fixed
- Registration form now correctly sends `password_confirm` field matching backend expectations
- Email validation now enforces institution-specific domains on both frontend and backend
- Course filtering by department now uses correct `department_id` field

---

## [0.6.0] - 2025-11-25
### Added
- **Caching Optimization System**:
  - Created `ElectionDataService` with caching for election queries
  - Created `VotingDataService` with caching for voting results and statistics
  - Implemented `@cache_result` decorator for function-level caching
  - Added cache invalidation methods for data consistency
  - Cached election data with related candidates (60 seconds)
  - Cached live voting results (30 seconds for real-time updates)
  - Cached election statistics (30-120 seconds based on update frequency)
  - Cached user voting status (120 seconds)
  - Cached position-specific results (60 seconds)
  - Cached winners data (30 seconds)
  - Created comprehensive usage examples and integration guide

- **Performance Improvements**:
  - Optimized database queries with `select_related()` and `prefetch_related()`
  - Reduced database hits for frequently accessed data
  - Implemented hash-based cache key generation for consistency
  - Added configurable cache timeouts for different data types

### Changed
- **Backend Architecture**:
  - Introduced service layer pattern for data access
  - Separated caching logic from view logic
  - Enhanced query optimization with strategic prefetching
  - Improved code maintainability and testability
- **Frontend UX**:
  - Collapsed desktop sidebar now renders an avatar-only profile pill to avoid clipped user details
  - Candidate application form clears stale selections and disables the position dropdown until fresh data loads
  - Application form messaging now surfaces when an election has no available positions
- **Accounts Data Model**:
  - Merged `Department` and `Course` into a unified `Program` model with `program_type` and parent-child relations
  - Updated profile serializers/views/admin to surface programs as departments/courses for API compatibility
  - Simplified admin workflows to manage academic structures from a single Program interface
- **Dev Experience**:
  - Added `python manage.py superuser` command for quick super-admin setup with CLI flags or environment defaults

### Fixed
- Candidate application form now sources positions via the new `election_positions` relation so choices always render after the database update
- MyApplications cards and withdraw modal fall back to `position_name` / `party_name` so positions keep showing even when nested objects are absent

### Technical Details
- Cache timeouts optimized by data volatility:
  - Live results: 30 seconds (high volatility)
  - Statistics: 45-60 seconds (moderate volatility)
  - Election data: 60-120 seconds (low volatility)
  - Static data: 180-300 seconds (very low volatility)
- Cache keys use MD5 hashing for consistency and collision avoidance
- Service methods use `@wraps` to preserve function metadata
- Ready for Redis integration in production environment

---

## [0.5.4] - 2025-11-18
### Changed
- **UI/UX Refinements**:
  - Dashboard candidate party badges now wrap text properly for long party names
  - Results page header now has consistent border-radius (20px) for visual polish
  - Election "Ended" badge updated to solid green color (#078612) for better consistency
  - Removed unnecessary box-shadow from ended badge for cleaner appearance

### Fixed
- Long political party names no longer overflow in dashboard candidate cards
- Results header visual alignment and styling consistency

---

## [0.5.3] - 2025-11-13
### Changed
- **UI/UX Improvements**:
  - Updated auth pages (login/register) to use E-Botar brand colors (green and yellow)
  - Changed auth page background from purple gradient to green gradient (#0b6e3b to #075a30)
  - Submit buttons now use yellow gradient (#f4cc5c to #e6b93e) with dark text
  - Auth page links changed to yellow theme color
  - Updated all form focus states to use green theme color
  - Auth pages now display within normal layout with navbar and footer visible
  - Removed full-screen auth page layout for consistency with site design

- **Layout & Spacing**:
  - Fixed content alignment issues with sidebar
  - Centered all page content properly with sidebar spacing
  - Main content now uses flexbox centering with max-width constraint (1400px)
  - Fixed footer positioning to stay at bottom of page
  - Adjusted main-content width to account for sidebar (calc(100% - 300px))
  - Content no longer pushed to the right when sidebar is visible

- **Election Pages Theme Update**:
  - Updated page title icon to green gradient
  - Filter tabs now use green for active state and hover
  - Election card hover border changed to green
  - Status badges updated: Active (green), Upcoming (yellow), Finished (gray)
  - Info card icon changed from blue to green
  - Info item icons: Start (green), End (emerald), Votes (yellow), Candidates (purple)
  - Action buttons updated to theme colors
  - Candidate avatars changed from blue to green gradient

- **Performance & Polish**:
  - Disabled all CSS animations and transitions sitewide for professional appearance
  - Removed all animation keyframes (float, pulse, spin, shimmer, etc.)
  - Instant UI interactions instead of animated effects
  - Removed text underlines from all links and buttons (hover, focus, active states)
  - Cleaner, more business-like interface

### Fixed
- Auth pages no longer cover entire viewport
- Content properly centered accounting for left sidebar
- Footer sticks to bottom on all pages
- Login and register pages maintain consistent layout with other pages
- Auth container properly centered with equal spacing

---

## [0.5.2] - 2025-11-11
### Added
- **Activity Logging System**:
  - Comprehensive activity logging for all critical actions
  - Vote submission logging with student ID and masked receipt
  - User management actions (activate/deactivate, password reset)
  - Election CRUD operations (create, update, delete)
  - Candidate application review (approve, reject, bulk operations)
  - IP address tracking for security audit
  - Student ID preference in all logs (fallback to username)

### Changed
- **UI/UX Improvements**:
  - Profile picture now displays in navigation circular button
  - Removed duplicate "Profile" menu item from sidebar
  - Profile button shows full name instead of "My Account"
  - Increased profile picture size (48px desktop, 44px mobile)
  - Enhanced avatar styling with 3px border and shadow
  - Bigger brand logo (64px) with increased topbar height (88px)
  - Fixed topbar and sidebar alignment (sidebar now starts at 88px)
  - Profile picture shows in both expanded and collapsed sidebar states

- **Backend API**:
  - Fixed 403 error on `/api/voting/results/statistics/` endpoint
  - Statistics endpoint now allows public access (AllowAny)
  - Real-time statistics available to all users
  - User profile context properly updated after profile edits

### Fixed
- Profile picture not showing in navigation button
- User data structure in AuthContext (nested user/profile objects)
- Full name display in sidebar (was showing "My Account")
- Topbar and sidebar height mismatch
- ProfileEditPage now updates AuthContext after successful save
- Avatar display in both desktop sidebar and mobile offcanvas

---

## [0.5.1] - 2025-11-11
### Added
- **Profile Management Features**:
  - Profile picture upload functionality with image preview
  - File validation (type and 5MB size limit)
  - Avatar remove functionality
  - Username display on profile page (non-editable)
  - Conditional email editing (only if not set)
  
### Changed
- **UI/UX Improvements**:
  - Redesigned profile page with modern, clean layout
  - Redesigned profile edit page with simple form design
  - Redesigned logout button in sidebar with red color scheme
  - Fixed sidebar icon visibility when collapsed
  - Removed white background from brand logo (transparent PNG support)
  - Profile and edit pages now use custom CSS (profile.css)
  - All profile sections use card-based layout with proper spacing
  
- **My Applications Page**:
  - Fixed alignment issues in application cards
  - Improved responsive behavior for mobile devices
  - Better text wrapping for long titles and descriptions
  - Fixed status badge positioning
  - Fixed action button layout and sizing

### Fixed
- Username field made non-editable in profile edit
- Email field made conditional (editable only if empty)
- Sidebar collapsed state now properly shows icons
- Brand logo no longer has white background box
- Application card header alignment on mobile
- Button wrapping issues in application cards

---

## [0.5.0] - 2025-11-11
### Added - Real-Time Voting & Enhanced Features 🚀
- **Real-Time Election Results**:
  - Live vote counting visible to all users during active elections
  - Auto-refresh every 10 seconds with pause/resume controls
  - "Live" badge indicator with green pulse animation
  - Real-time statistics (total voters, votes cast, positions)
- **Automatic Winner Highlighting**:
  - Winners automatically highlighted when election ends
  - Gold trophy icon (🏆) and "WINNER" badge
  - Golden border with glow effect (3px border + shadow)
  - Yellow progress bar for winning candidates
  - Rank tracking (1st, 2nd, 3rd place)
- **Vote Counting System**:
  - Total votes now counts unique voters (not sum of all position votes)
  - Fixed percentage calculations per position
  - VoteReceipt-based counting for accuracy
  - Backend serializers include `total_votes` field
- **Auto-Rejection System**:
  - Candidates not approved before election starts are auto-rejected
  - Three implementation methods: signals, cron job, manual API
  - Rejection memo: "Application automatically rejected due to election commencement"
- **Admin Panel Enhancements**:
  - Complete redesign of 6 admin pages with modern UI
  - ElectionFormPage with preset positions dropdown (President, VP, Secretary, etc.)
  - UserManagementPage as table with search, filters, action buttons
  - SystemLogsPage with activity viewer
  - Updated sidebar navigation with new admin sections
- **Profile Module**:
  - Fixed ProfilePage API integration
  - Created EditProfilePage with form validation
  - Profile picture upload support
- **Receipt Verification**:
  - VerifyReceiptPage for users to verify their votes
  - Receipt code input with validation
  - Displays election info and timestamp
- **UI/UX Improvements**:
  - "View Live Results" button during active elections
  - "View Final Results" button after elections end
  - Enhanced election details page with vote statistics
  - Logo implementation in header (rounded corners, white background)
  - Browser favicon updated to use logo
  - Page title updated to "E-Botar - SNSU Online Voting System"

### Fixed
- Import paths in admin pages (../../ → ../../../)
- Button component underlines removed
- ProfilePage authentication service call
- UserManagementPage API endpoint
- VoteReceipt serializer field names
- Results endpoint access restrictions removed
- Election details page vote count display (was showing 0)

### Changed
- **Backend** (`apps/voting/views.py`):
  - Removed access restrictions for results endpoint
  - Added `election_ended` and `is_active` flags to API response
  - Added `is_winner` and `rank` fields to candidate results
  - Vote counting logic uses VoteReceipt for unique voters
- **Backend** (`apps/elections/serializers.py`):
  - Added `total_votes` field to SchoolElectionListSerializer
  - Added `total_votes` field to SchoolElectionDetailSerializer
  - Imported VoteReceipt model for vote counting
- **Frontend** (`ResultsDetailsPage.jsx`):
  - Added auto-refresh functionality (10-second intervals)
  - Added winner highlighting with conditional styling
  - Added live status indicators and notifications
  - Enhanced UI with badges and animations
- **Frontend** (`ElectionDetailsPage.jsx`):
  - Added "View Live Results" button for active elections
  - Separated live vs final results navigation
- **CSS** (`elections.css`):
  - Added `.action-btn-success` style for live results button
- **CSS** (`global.css`):
  - Updated `.brand-logo` styling (rounded square, white background, padding)
- **HTML** (`index.html`):
  - Updated favicon from vite.svg to logo.png
  - Updated page title for better branding

### Technical Details
- **Real-Time Architecture**:
  - Client-side polling every 10 seconds during active elections
  - Server returns winner flags only after election ends
  - Stateful auto-refresh with user controls
- **Winner Detection**:
  - Backend calculates winners: `is_winner = election_ended and idx == 0 and vote_count > 0`
  - First place (highest votes) marked as winner per position
- **Vote Privacy Maintained**:
  - Anonymized votes (VoteReceipt → Ballot → VoteChoice → AnonVote)
  - Live results show aggregate counts only
  - Individual vote choices remain anonymous

### Statistics
- **Files Modified**: 12
- **New Features**: 8 major features
- **Bug Fixes**: 7
- **Lines Added**: ~1,500+
- **User Experience**: Significantly enhanced with real-time capabilities

---

## [0.4.0] - 2025-11-10 (Phase 3 COMPLETE!)
### Added - ALL MODULES COMPLETE! 🎉
- **Elections Module** (100%):
  - ElectionListPage with filtering (All, Active, Upcoming, Finished)
  - ElectionDetailsPage with candidates display by position
- **Candidates Module** (100%):
  - CandidateListPage - Browse all candidates with election filter
  - CandidateProfilePage - View candidate manifesto and details
  - ApplicationFormPage - Apply as candidate with photo upload
  - MyApplicationsPage - Track application status, withdraw pending apps
- **Voting Module** (100%):
  - VotingPage - Complete ballot submission with position-by-position voting
  - Vote validation and confirmation modal
  - Receipt generation and double-vote prevention
  - MyVotesPage - Voting history with receipts
- **Results Module** (100%):
  - ResultsDetailsPage - Results by position with rankings
  - Winner display (1st, 2nd, 3rd) with trophies
  - Vote counts, percentages, and progress bars
  - Statistics overview
- **Profile Module** (100%):
  - DashboardPage - Home/dashboard with election overview
  - ProfilePage - View user profile and academic info
- **Admin Module** (100%):
  - AdminDashboardPage - Overview with statistics cards
  - ApplicationsListPage - View/filter all applications
  - ApplicationReviewPage - Review applications (approve/reject)
  - ElectionManagementPage - Manage all elections
- **Complete Integration**:
  - All 16 pages fully functional
  - 70+ files created
  - 15,000+ lines of production-ready code
  - All API endpoints integrated
  - 25+ routes configured

### Documentation
- `PHASE3_COMPLETE_SUMMARY.md` - Complete achievement summary
- `FRONTEND_MODULE_PROGRESS.md` - Module completion tracker
- `PHASE3_SESSION_SUMMARY.md` - Detailed session log
- Updated `AppRoutes.jsx` with all module routes

### Statistics
- **Total Pages**: 16 (all functional)
- **Total Components**: 14
- **Total Services**: 4
- **Total Routes**: 25+
- **Total Files**: 70+
- **Lines of Code**: ~15,000+
- **Completion**: 95% (design polish pending)

---

## [0.3.0-alpha] - 2025-11-10 (Phase 3 Started)
### Added
- **Complete Frontend Restructure**:
  - Modular architecture with 7 feature modules (auth, elections, candidates, voting, results, profile, admin)
  - 50+ new files, ~7,000+ lines of React code
- **Service Layer** (4 complete modules):
  - `authService.js` - Authentication APIs
  - `electionService.js` - Elections, positions, parties APIs
  - `candidateService.js` - Candidates and applications APIs
  - `votingService.js` - Voting, receipts, results APIs
- **Component Library**:
  - 7 common components (Button, Card, Badge, Alert, LoadingSpinner, Modal, EmptyState)
  - 3 layout components (Navbar, Footer, Container)
  - ProtectedRoute for route authentication
- **Auth Module** (Complete):
  - LoginPage with form validation
  - RegisterPage with department/course selection
  - AuthContext for global state management
  - useAuth custom hook
- **Design System**:
  - CSS variables system (`variables.css`)
  - Global styles with E-Botar branding (`global.css`)
  - Brand colors: Green (#0b6e3b), Yellow (#f4cc5c)
  - Typography, spacing, shadow systems
- **Utility Functions**:
  - formatters.js (9 functions)
  - validators.js (10 functions)
  - helpers.js (16 functions)
  - constants.js (application constants)
- **Routing System**:
  - AppRoutes with 20+ routes
  - Public, protected, and admin routes
- **Documentation**:
  - `FRONTEND_STRUCTURE.md` - Architecture guide
  - `IMPLEMENTATION_PROGRESS.md` - Progress tracker
  - `PHASE3_PROGRESS_SUMMARY.md` - Session summary

### Changed
- Moved `api.js` to `services/` folder
- Updated `App.jsx` and `main.jsx` for new architecture
- Created placeholder pages for all modules

### Status
- ✅ Phase 3 Foundation Complete
- 🚧 Module Implementation In Progress
- 📊 Foundation: 50+ files, 46+ API endpoints integrated

## [0.2.0] - 2025-11-10

### Added - Backend API (Phase 1 Complete)
- **Accounts Module** (`apps.accounts`)
  - User registration and JWT authentication
  - User profile management with auto-generated student IDs
  - Department and Course hierarchical management
  - 8 REST API endpoints for authentication and profile operations
  
- **Elections Module** (`apps.elections`)
  - Election lifecycle management (create, active, upcoming, finished)
  - School positions and parties management
  - Election-position mapping with ordering
  - 9 REST API endpoints with role-based access control
  
- **Candidates Module** (`apps.candidates`)
  - Candidate application submission workflow
  - Application review system (approve/reject/withdraw)
  - Bulk review operations for admins
  - File upload support for photos and documents
  - Business rules enforcement (no consecutive terms, party restrictions)
  - 9 REST API endpoints with permission controls
  
- **Voting Module** (`apps.voting`)
  - Privacy-preserving ballot submission with immediate anonymization
  - Vote receipt generation and verification
  - Election results computation and statistics
  - CSV and JSON export functionality for results
  - Voter turnout analytics
  - 12 REST API endpoints with comprehensive features
  
- **Common Services** (`apps.common`)
  - Security event logging (login attempts, suspicious activity, etc.)
  - Activity audit trails for all user actions
  - Access attempt tracking with IP logging
  - Security middleware for automatic event capture
  - Signal handlers for authentication events
  - Utility functions for logging and security

### Added - Documentation
- `Phase_Implementation.md` - Complete implementation roadmap and progress tracking
- `ADMIN_DASHBOARD_SPEC.md` - Comprehensive React admin dashboard specification
- `PHASE1_COMPLETION_SUMMARY.md` - Detailed Phase 1 completion summary
- Code documentation with docstrings throughout all modules
- Django admin interfaces for all 18 custom models

### Added - Security Features
- JWT-based stateless authentication
- Role-based access control (public, authenticated, admin)
- Security event logging middleware
- Failed login attempt tracking
- IP address and user agent logging
- Privacy-preserving vote anonymization
- SHA-256 hashed vote receipts

### Changed
- Project architecture migrated from monolithic Django to DRF + React split-stack
- Authentication changed from session-based to JWT tokens
- Vote storage redesigned for privacy (immediate anonymization)
- Admin interface specification changed from Django templates to React dashboard
- Enhanced .gitignore for Django + React monorepo structure

### Removed
- `apps.api` placeholder app (replaced with domain-specific apps)
- Legacy monolithic structure dependencies

### Technical Details
- **Total API Endpoints**: 50+ RESTful endpoints
- **Database Models**: 18 custom models across 5 apps
- **Migrations**: All applied successfully
- **Django Version**: 5.2.8
- **DRF Version**: 3.16.1
- **JWT Library**: djangorestframework-simplejwt 5.5.1
- **Database**: SQLite (development), PostgreSQL-ready
- **File Storage**: Local media with Pillow support

### Architecture
- Backend: Django REST Framework with JWT authentication
- Frontend: React + Vite (existing scaffold)
- Middleware: Security logging, CORS enabled
- Database: Relational with proper foreign keys and indexes

### API Summary by Module
- **Accounts**: 8 endpoints (auth, profiles, departments, courses)
- **Elections**: 9 endpoints (elections, positions, parties, status filters)
- **Candidates**: 9 endpoints (applications, reviews, bulk operations)
- **Voting**: 12 endpoints (ballots, receipts, results, exports, statistics)
- **Common**: Middleware + utilities (security logging, audit trails)

---

## [0.1.0] - 2025-11-10

### Added - Initial Setup
- Initial Django backend setup with JWT authentication
- React frontend with Vite
- Protected route component for authenticated pages
- User registration and login pages
- API integration with axios interceptors
- CORS configuration for frontend-backend communication

### Fixed
- React Router import paths and component exports
- ProtectedRoute component missing React hooks imports
- jwt-decode v4 API compatibility (named export)
- Typo in localStorage clearing function
- File path case sensitivity (NotFound vs Notfound)

### Security
- Environment variables properly ignored from version control
- JWT token storage in localStorage with refresh mechanism

---

## How to Use This Changelog

- **Added** for new features.
- **Changed** for changes in existing functionality.
- **Deprecated** for soon-to-be removed features.
- **Removed** for now removed features.
- **Fixed** for any bug fixes.
- **Security** in case of vulnerabilities.

When releasing a new version, move items from `[Unreleased]` to a new version section.

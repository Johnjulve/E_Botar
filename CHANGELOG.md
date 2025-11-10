# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

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

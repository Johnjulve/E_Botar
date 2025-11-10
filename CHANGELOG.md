# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Changed
- Enhanced .gitignore for Django + React monorepo
  - Added media/, staticfiles/, build artifacts
  - Added environment files (.env*)
  - Added frontend node_modules, dist, coverage
  - Added editor and OS-specific files

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

When releasing a new version, move items from `[Unreleased]` to a new version section like:

```markdown
## [0.1] - 2025-11-10
### Added
- Feature description
- Structure of frontend & backend
```

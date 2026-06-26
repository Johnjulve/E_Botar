# E-Botar - System Information

**Version 2.1.0** | Complete system documentation and technical details

[![Django](https://img.shields.io/badge/Django-5.2.8-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.1-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)](#)

---

## 📖 Table of Contents

- [Release Highlights (2.1.0)](#-release-highlights-210)
- [Overview](#overview)
- [Research Foundation](#research-foundation)
- [Algorithms & Data Structures](#-algorithms--data-structures)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [User Workflows](#user-workflows)
- [Development](#development)
- [Documentation](#documentation)
- [Roadmap](#roadmap)

---

## 🚀 Release Highlights (2.1.0)

- **Major release**: **Google Sign-In**, vote-ledger integrity, receipt UX modernization, election metrics correctness, profile-edit PATCH payloads, navbar polish, and documentation handbooks.
- **Google Sign-In (`POST /api/auth/google/`)**:
  - **django-allauth** `SocialAccount`/`SocialApp` integration (Sites **`SITE_ID`**) with **`google.oauth2.id_token`** verification for JWT **ID credentials** (`credential`) and **`openidconnect.googleapis.com/userinfo`** for **OAuth access tokens** (`access_token`).
  - **Rules**: Verified Google email required (`email_verified`); new accounts get unique usernames from email locals; **`409`**/`requires_password` when linking Google to an existing local account followed by **`password`** confirmation and `SocialAccount` creation.
  - **Frontend** ([LoginPage](frontend/src/modules/auth/pages/LoginPage.jsx), [AuthContext](frontend/src/contexts/AuthContext.jsx)): Google Identity Services script, **`VITE_GOOGLE_CLIENT_ID`**; **Continue with Google**; link modal when server requests password.
- **Blockchain-inspired ledger**:
  - Ballot pipeline appends **`VoteBlock`** records ([vote_ledger.py](backend/apps/voting/vote_ledger.py)); migration **`0002_voteblock`** creates the table.
  - Staff/admin verification endpoints and Django admin integrations; hash normalization avoids false negatives on legacy payloads.
- **Receipt flow** ([CHANGELOG.md](CHANGELOG.md) § **2.1.0**):
  - Short **`ABCD-EFGH`** receipts; hyphenless/lowercase normalization for verify APIs/UI; legacy receipts migrated/rehashed where applicable.
- **Election serializers** ([CHANGELOG.md](CHANGELOG.md) § **2.1.0**):
  - **`total_votes` / `total_positions`** use distinct-aware counting paths (no inflated join counts).
- **Profile editing** ([patchPayload.js](frontend/src/utils/patchPayload.js), [ProfileEditPage](frontend/src/modules/profile/pages/ProfileEditPage.jsx)):
  - **`getChangedFields`** builds minimal **`PATCH`** bodies for **`/api/auth/me/`** semantics.
- **UI**: Sidebar **E-Botar** label alignment with sidebar toggle controls.
- **Documentation**: **[Document.md](Document.md)** handbook; this file gained a ***documentation map***, stewardship guidance, and monorepo path reference — see **[CHANGELOG.md](CHANGELOG.md)** **[2.1.0]**.

### Previous Highlights (1.0.0)

- **App Version Single Source of Truth**: UI version (e.g. "E-Botar v2.1.0") is driven from `frontend/src/constants.js` (`APP_VERSION`).
- **Admin User Directory (Read-Only)**, **Voting Status (Per Election)**, **Admin metrics endpoints** (`user-count`, `directory`, `voting-status`).
- **Admin Tables Upgrade**, **Application Pages Upgrade**, **Data Export PDF Improvements**, **Layout + Responsiveness Fixes** (see [CHANGELOG.md](CHANGELOG.md) § 1.0.0).

### Documentation & environment (since 1.0.0)

- **Unified `.env.example`**: Single template at the repository root (same folder as `README.md`) lists Django and Vite-related variables; copy to `.env` locally. **Django load order** (`backend/backend/settings.py`): repo-root `.env` first, then `backend/.env` (override).
- **Admin registry UI**: Election, party, and position management share a consistent registry layout (header, filters, tables); party/position add/edit use modals with scoped CSS so Bootstrap dialogs stay centered (fixes conflicts with legacy `applications.css` modal rules).
- **Application Review & Verify Receipt**: Application review uses a centered column layout (`admin-review-page`); verify receipt flow uses a narrow, minimal voter page layout in `voting.css`.
- **`.gitignore`**: Root and `frontend/.gitignore` support monorepo workflows (tracked `.env.example`, ignored secrets and local deploy dirs).

### Previous Highlights (0.7.8)

- **College Terminology Alignment**: UI consistently uses "College" for department-type programs and academic info, while underlying program_type values remain `department`/`course`.
- **Program Type Badge**: Admin Programs list shows "College" badge for department-type rows; Courses remain unchanged.
- **Profile Edit Terminology**: Academic info labels and placeholders use "College," and the course selector prompts "Select College First."
- **Data Export Terminology**: Data export pages updated to use "College" terminology consistently throughout PDF exports, labels, and dropdowns.
- **API Guide**: Frontend route `/guide` and backend-served `/guide/` provide full API documentation; usable when only the backend is accessible. Footer link to API Guide.
- **Configurable Branding**: Public `GET /api/common/branding/` and frontend `BrandingContext`; institution name, logo, and app name configurable via System Settings for multi-school reuse (Navbar, Dashboard, Footer, Login, Register, Data Export). See backend `BRANDING.md`.
- **Middle Name Support**: UserProfile and registration/profile edit support middle name; display uses "first middle last" formatting via `getFullName()` helper. Run `python manage.py migrate accounts` for migration `0003_add_middle_name`.
- **Profile Image Fallback**: When profile or candidate photos fail to load, UI shows initials placeholders; backend cleans up old avatar files on save and provides `cleanup_unused_media` management command for orphaned images.
- **CSS Architecture & Documentation**: Foundation/global/vendors structure in place; `global.css` removed. README and `frontend/CSS_STRUCTURE_REVIEW.md` updated; see `frontend/CSS_ARCHITECTURE_STRATEGY.md` for rules and structure.
- **Election Creation & Management**: Spam-click prevention (frontend ref guard + backend 10s rate limit), duplicate A.Y. prevention (cannot create another election for same academic year and category—USC or department), Delete on edit for superusers (with confirmation).
- **Academic Year Selector (Home)**: Dashboard academic year dropdown shortened to 2 years past and 5 years ahead (8 options total).

### Previous Highlights (0.7.7)

- **Profile Completeness Validation**: Enhanced data integrity with comprehensive profile completeness checks
  - **Candidate Application Validation**: Users must complete their profile (Student ID, Department, Course, Year Level) before applying as candidates
  - **Voting Restrictions**: Users cannot vote until their profile is complete, with clear warnings and guidance
  - **Frontend Warnings**: Incomplete profile warnings displayed on application and voting pages with links to profile edit
  - **Backend Validation**: Server-side validation prevents incomplete profile submissions for both applications and votes
  - **Missing Fields Display**: Users see exactly which fields need to be completed (Student ID, Department, Course, Year Level)
  - **Staff/Admin Exemption**: Staff and admin users are exempt from profile completeness requirements

- **Position Management Improvements**: Streamlined position ordering system
  - **Auto-Assignment**: Display order automatically assigned starting from 1 (no manual input required)
  - **Smart Reordering**: Swap-based reordering ensures unique and contiguous ordering without gaps
  - **Button Controls**: Move up/down buttons with proper boundary checks (disabled at top/bottom)
  - **Simplified UI**: Removed display order input field from form for cleaner interface

- **Candidate Directory Enhancements**: Improved candidate information display
  - **Course/Year Display**: Replaced "Voting Period" with "Course/Year" showing format "BSCS (course code) - 4 (Year level)"
  - **Visual Updates**: View Election button matches green theme color (#0b6e3b)
  - **Profile Picture Styling**: Slight gray gradient for profile pictures with grayscale filter
  - **Simplified Design**: Removed glow effects and extra design elements for cleaner appearance

- **Student Count Fix**: Accurate student statistics for all users
  - **New Endpoint**: Added `/api/auth/student-count/` endpoint for total student count
  - **Permission Fix**: Non-admin users can now see correct total student count (previously showed only 1)
  - **Election Statistics**: Results pages now show accurate eligible student counts
  - **Dashboard Accuracy**: Homepage dashboard displays correct student statistics

- **Guest Mode Privacy**: Enhanced privacy and security for unauthenticated users
  - **Statistics Visibility**: Statistics cards (Students, Votes Recorded) are hidden for guest/unauthenticated users
  - **Conditional Data Fetching**: Student count and vote statistics only fetched when user is authenticated
  - **Public Data Access**: Guest users can still view elections, candidates, and winners (public information)
  - **Security Enhancement**: Prevents unauthorized access to sensitive statistics
  - **Frontend Implementation**: Dashboard page checks `isAuthenticated` before displaying statistics and fetching sensitive data

### Previous Highlights (0.7.6)
- **Algorithm Library**: Efficient, reusable algorithm helpers focused on current production use.
  - **Sorting**: Quicksort and merge sort
  - **Searching**: Binary search, binary search by field, linear search
  - **Aggregation**: Count/sum/avg/min/max/list/set style grouping
  - **Cryptography**: SHA-256 and RSA helpers via `cryptography`
  - **Memoization**: Hash-key-based memoization for repeated computations
  - **Production Integrated**: Used by voting, election, and data-processing services

### Algorithm Integration (0.7.6)
- **Voting Module**: Candidate sorting in election results uses `SortingAlgorithm.quicksort()`
- **Services**: Cache key generation uses `CryptographicAlgorithm.sha256_hash()` in voting and election services
- **Models**: Vote receipt and vote hash generation use `CryptographicAlgorithm.sha256_hash()`
- **Vote Counting**: Aggregation algorithms used for efficient vote counting and statistics
- **Performance Optimization**: Memoization added to expensive calculations (vote percentages, turnout)
- **Documentation**: Complete algorithm documentation added to Information.md with complexity analysis

### Performance Testing & Load Testing (0.7.6)
- **Performance Test Suite**: Comprehensive testing framework for API and algorithm performance
  - Algorithm benchmarks (sorting, searching, aggregation)
  - API endpoint response time measurement
  - Database query performance analysis
  - Performance quality scoring (0-100 scale)
  - JSON report generation for documentation

- **Load Testing with Locust**: Industry-standard load testing configuration
  - Simulated user behavior patterns
  - Concurrent user testing
  - Request rate and response time monitoring
  - Failure rate tracking
  - Web-based real-time monitoring interface

- **Throttling Management**: Rate limiting control for testing and development
  - Management command: `python manage.py reset_throttling`
  - User-specific throttle reset capability
  - Cache-based throttling with automatic expiration
  - Configurable rate limits per endpoint scope

### Previous Highlights (0.7.5)
- **Automatic Session Timeout**: Enhanced security with auto-logout after user inactivity
  - **5-Minute Inactivity Timeout**: Users are automatically logged out after 5 minutes of inactivity
  - **Comprehensive Activity Tracking**: Monitors mouse movements, keyboard input, clicks, scroll, and touch events
  - **Smart Tab Handling**: Pauses timer when tab is hidden, resumes and checks timeout when tab becomes active
  - **Silent Operation**: No warnings or notifications - seamless automatic logout for enhanced security
  - **Production Ready**: Works reliably in both development and production environments
  - **Security Enhancement**: Prevents unauthorized access from unattended sessions

### Previous Highlights (0.7.4)

- **System Log API & UI Integration**: Added staff-only `/api/common/system-logs/` endpoint with consolidated security and activity logs, granular filtering, and monthly backup reminders.
- **Form Submission Throttling**: Introduced scoped DRF throttles to prevent rapid duplicate submissions across vote submission, registration, profile updates, and candidate applications.
- **Admin Management Pages**: Complete frontend interfaces for Party and Position Management with full CRUD operations, active status toggling, and reordering functionality.
- **Enhanced Data Export System**: Comprehensive PDF export functionality for election results and student data with vote categorization, mock data generation for testing, and privacy-focused statistics-only display.
- **Dashboard Improvements**: Updated homepage and results page statistics to show "Students" and "Votes Recorded", plus "Current Administration" display showing winners from last finished election.

### Previous Highlights (0.7.3)
- **Election Type System**: Support for University Student Council (USC) and Department Elections with automatic eligibility checks, auto-generated titles using Academic Year (AY) format, and visual type badges.
- **Eligibility System**: Automatic checks for voting and candidate applications with department-based enforcement for Department Elections and frontend eligibility warnings.
- **Admin Profile Flexibility**: Academic information (Student ID, Year Level, Department, Course) is now optional for administrators while remaining required for students.

### Previous Highlights (0.7.2)
- **Program Management Module**: Complete CRUD interface for managing departments and courses with filtering, form validation, and real-time updates.
- **CSV Import/Export Functionality**: Bulk import and export of programs with overwrite logic, detailed import results, comprehensive error reporting, and Excel-compatible format.
- **Admin Sidebar Navigation**: Added "Programs" menu item integrated into admin navigation structure.

### Previous Highlights (0.7.1)
- **Production API Fixes**: Fixed `/me` endpoint access issues in production with enhanced error handling, automatic token refresh, and improved CORS configuration for multiple frontend URLs.
- **Backend Error Resolution**: Resolved 500 Internal Server Error on `/me` endpoint by fixing serializer handling of None values (department, course) and adding comprehensive error handling with logging.
- **Database Migration Fixes**: Fixed "no such table" errors by adding explicit `db_table` settings to all 12 models across 5 apps (accounts, elections, candidates, voting, common), ensuring consistent database schema and preventing migration issues in production.
- **Automatic Token Refresh**: API service now automatically refreshes expired JWT tokens, providing seamless user experience without manual re-authentication.
- **Enhanced Production Deployment**: Improved CORS configuration, environment variable handling, and production-ready error messages with detailed logging for troubleshooting.

> ⚠️ **Important**: After deploying version 0.7.1, run `python manage.py migrate` in production to create/update database tables with the new explicit table names.

### Previous Highlights (0.7.0)
- **Production Deployment Configuration**: Added Vercel deployment configuration and production-ready build settings for both frontend and backend.

### Previous Highlights (0.6.4)
- **Fixed staff access to admin panels**: Staff users can now properly access admin panels they're allowed to use (election management, application review). Admin-only features (user management, system logs) remain restricted to superusers.
- **Enhanced permission system**: Created custom permission classes (`IsSuperUser`, `IsStaffOrSuperUser`) to properly distinguish between staff and admin roles, ensuring staff cannot access admin-only privileges.
- **Improved data privacy**: Sensitive user fields (`is_staff`, `is_superuser`) are now properly hidden from non-admin users in API responses, while users can still see their own fields for role checks.

### Previous Highlights (0.6.3)
- **Three-tier role system**: Implemented comprehensive role-based access control with Student, Staff, and Admin roles. Admins can now manage user roles through the user management interface.
- **Role management interface**: Added role change functionality with visual role badges, filtering, and permission descriptions for better user administration.
- **Enhanced user management**: Updated user management page with Staff role support, role statistics, and intuitive role assignment workflow.

### Previous Highlights (0.6.2)
- **One application per election**: Users can now only submit one application per election, regardless of position. To change positions, users must withdraw their existing application first.
- **Enhanced application validation**: Database-level constraint and application-level validation ensure data integrity and provide clear error messages.
- **Improved error handling**: Frontend application form now properly displays validation errors with better user guidance.

### Previous Highlights (0.6.1)
- **Simplified position management**: Removed `position_type` categorization from positions, allowing flexible position creation without predefined types.
- **Direct department linkage**: Program model now uses explicit `department` foreign key instead of generic parent reference, improving query clarity and admin workflows.
- **Enhanced registration security**: Email domain validation restricts registration to institution domains (snsu.edu.ph, ssct.edu.ph) with validation on both frontend and backend.
- **Registration form improvements**: Fixed password confirmation field, added optional name fields, and improved error handling for better user experience.
- **Admin privacy protection**: VoteChoice admin interface now masks ballot identifiers to protect voter privacy while maintaining audit capabilities.

---

## 🎯 Overview

E-Botar is a comprehensive electronic voting system designed specifically for student government elections. Built on blockchain-inspired security principles and privacy-preserving technologies, it provides a transparent, verifiable, and user-friendly platform for democratic participation in educational institutions.

### Blockchain-Inspired System Concept (Detailed)

E-Botar is designed as a **single-system voting platform** that applies blockchain principles without requiring decentralized nodes or cryptocurrency infrastructure.

#### Concept Goals

1. **Integrity**: Any unauthorized change in vote-related records must be detectable.
2. **Immutability (application level)**: Voting records are treated as append-only for operational trust.
3. **Verifiability**: Voters and administrators can validate participation and results through receipts and audits.
4. **Privacy**: Voter identity is separated from vote tally data.
5. **Practical Deployment**: Preserve compatibility with institutional constraints (centralized backend, standard DB, existing governance).

#### Blockchain Principles Adapted to E-Botar

- **Block Structure Concept**:
  - vote sequence index
  - timestamp
  - voter fingerprint (hashed identity reference)
  - vote payload (position/candidate context)
  - previous hash
  - current hash (SHA-256)
- **Hashing**: SHA-256 is used for receipt and vote-related integrity checks.
- **Chaining**: Logical hash-linking enables tamper evidence across sequential vote events.
- **Immutability Rules**: operational policy disallows arbitrary mutation of finalized vote records.
- **Validation**: business validation + data integrity checks ensure consistent election state.
- **Consensus Simulation**: administrative validation and audit controls simulate trust governance in a centralized setup.

#### Operational Flow (How It Works in Practice)

1. User authenticates and submits a ballot.
2. System validates:
   - election is active
   - user is eligible
   - user has not already voted
3. Receipt is generated and hashed for individual verification.
4. Vote choices are anonymized for tallying (`AnonVote`) to protect voter privacy.
5. Results and statistics are computed from anonymized records.
6. Activity/security logs provide audit evidence for election governance.

#### Flow Process of the System (Input-Process-Output)

**Input**
- Student and admin credentials
- Election configuration (positions, schedules, eligibility rules)
- Candidate applications and approved candidate profiles
- Ballot selections from authenticated voters

**Process**
1. **Authentication and Access Control**
   - Users register/login.
   - Role-based permissions determine allowed actions (Student, Staff, Admin).
2. **Election and Candidate Preparation**
   - Admin/staff configure election events and schedules.
   - Candidate applications are reviewed and approved/rejected.
3. **Voting Validation**
   - System validates active election window, voter eligibility, and one-vote-per-election rule.
4. **Vote Submission and Recording**
   - Ballot is submitted and stored with receipt generation.
   - Vote choices are transformed into anonymized records for tallying.
5. **Verification and Auditing**
   - Voters verify participation through receipt validation.
   - Security and activity logs capture system actions.
6. **Result Generation**
   - Tallies and rankings are computed from anonymized vote data.
   - Results/statistics are shown based on election state and access policy.

**Output**
- Verified vote submission receipt
- Privacy-preserving election tallies
- Position rankings and winner outputs
- Auditable administrative and security records

#### Research-to-Implementation Mapping

- **Research Objective**: blockchain-inspired voting integrity model.
- **Current Production-Oriented Implementation**:
  - centralized backend (Django + DRF)
  - cryptographic hashing (SHA-256) for verification workflows
  - anonymized vote storage for tally integrity and privacy
  - role-based controls and audit logging for governance accountability

This approach preserves the thesis concept while remaining practical and maintainable for institutional production deployment.

#### Blockchain-Inspired Highlight Flow and Benefits

E-Botar applies blockchain-inspired principles in a centralized architecture by combining cryptographic integrity, controlled write paths, and auditable records.

**Blockchain-Inspired Flow**
1. Voter submits ballot after eligibility checks.
2. System creates verifiable receipt artifacts (code + hash validation path).
3. Vote choices are separated from direct voter identity for privacy-preserving tallying.
4. Records are treated as append-only through process and access control policies.
5. Audit/security logs preserve a traceable timeline of election actions.
6. Result computation uses anonymized vote datasets.

**Why this brings benefits (even with transparency and encryption concerns)**
- **Integrity without full decentralization**: cryptographic checks make tampering detectable while keeping deployment simple for campus operations.
- **Transparency with privacy boundaries**: stakeholders can audit process integrity and totals without exposing private voter identity.
- **Practical security posture**: role-based controls, validation rules, and logging provide governance safeguards suitable for institutional elections.
- **Faster and more reliable operations**: automated validation, tallying, and receipt workflows reduce manual errors and delays.
- **Research-to-production fit**: preserves the thesis objective (blockchain-inspired trust model) while remaining maintainable in a single-system environment.

### Vision
To modernize student elections by providing a secure, accessible, and efficient digital voting platform that maintains the integrity of the democratic process while enhancing voter participation and transparency.

### Thesis Research
This system is developed as part of academic research on **"Blockchain-Inspired Electronic Voting Systems for Student Government Elections"**, focusing on:
- Privacy-preserving vote anonymization
- Cryptographic receipt verification
- Transparent audit trails without compromising voter privacy
- Modern web architecture for scalability and maintainability

### Thesis Alignment Snapshot

#### General Objective
Develop an online voting system for Surigao del Norte State University that makes elections easier, more reliable, and more secure while preserving fair results.

#### Specific Module Objectives
1. Authentication Module
2. Voting Module
3. Candidate Module
4. Security Module
5. Result Module
6. Admin Module

#### Scope and Limitations (Implemented Context)
- **Scope**:
  - User registration, secure login, and profile management
  - Ballot display, vote casting, and receipt-based verification
  - Candidate application and candidate profile display
  - Role-based access control, activity/security logging, and cryptographic integrity workflows
  - Real-time tally presentation and election result generation
  - Administrative configuration for election events, applications, and user operations
- **Limitations**:
  - Web-based operation requires reliable internet access during voting
  - Concurrent performance depends on hosting/server capacity
  - Registration remains limited to authorized academic email domains

---

## 📚 Research Foundation

E-Botar implements key findings from extensive research on electronic voting systems:

### Core Research Principles

**1. Privacy & Anonymity**
- Immediate vote anonymization upon submission
- Separation of voter identity from vote choices
- Encrypted ballot storage for personal verification
- No linkage between votes and voters in tallying

**2. Verifiability**
- Individual verifiability through receipt-code validation
- Voters can verify their ballot was recorded correctly
- Audit trail without compromising privacy
- Transparent result computation

**3. Security by Design**
- Multi-layer encryption for sensitive data
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Comprehensive security event logging

**4. Usability & Accessibility**
- Intuitive user interface for all stakeholders
- Mobile-responsive design
- Clear feedback and guidance
- Accessibility standards compliance

### Research-Driven Architecture

The system architecture is informed by academic research on:
- **Blockchain concepts**: Immutability, transparency, decentralization principles
- **Cryptographic voting protocols**: Receipt-based verification, homomorphic properties
- **Privacy-preserving systems**: Anonymous credential systems, mix networks
- **Modern web architecture**: RESTful APIs, microservices patterns, stateless authentication

---

## 🔬 Algorithms & Data Structures

The backend module `apps/common/algorithms.py` is intentionally **small** and aimed at **school-scale** use: sorting and searching, vote **aggregation**, **memoization** (cache keys / optional in-process memoization), and **cryptography** (SHA-256 + RSA helpers). Older general-purpose grouping, hierarchy, categorization, organization, and batch-processing classes were removed to reduce complexity; use Django querysets, Python `defaultdict`, or plain loops where you need multi-level layouts.

### What’s in `algorithms.py`

#### 1. **Sorting** (`SortingAlgorithm`)
- **Quicksort** and **mergesort** with optional `key` and `reverse` — used for election results / candidate ordering in voting code paths.

#### 2. **Searching** (`SearchingAlgorithm`)
- **Binary search** and **binary_search_by_field** for sorted sequences.
- **Linear search** for unsorted lists (also used by the `search()` helper when `sorted_list=False`).

#### 3. **Aggregation** (`AggregationAlgorithm.aggregate`)
- Single-pass **count / sum / avg / min / max / list / set** by a key function — used for vote tallies and related statistics in `apps/voting`.

#### 4. **Cryptography** (`CryptographicAlgorithm`)
- **SHA-256** for receipt and vote fingerprint digests.
- **RSA** helpers: key generation, PSS-SHA256 sign/verify, RSA-OAEP encrypt/decrypt for short payloads (see `requirements.txt`: `cryptography`).

#### 5. **Memoization** (`MemoizationAlgorithm`)
- **memoize_with_key** decorator and **generate_hash_key** (SHA-256 of serialized args) — used in voting/election services for cache keys and repeated computations.

Optional **convenience** functions at module bottom: `aggregate_by`, `sort_by`, `search`.

### Algorithm Selection Rationale

**Why These Algorithms?**
1. **Performance**: All algorithms chosen for optimal time/space complexity
2. **Generality**: Type-agnostic design allows reuse across all features
3. **Flexibility**: Custom key functions and comparators support diverse use cases
4. **Industry Standard**: Common algorithms (quicksort, binary search) are well-understood and proven
5. **Scalability**: Algorithms scale efficiently with data size

**Common vs. Domain-Tuned Algorithms**
- **Common Algorithms**: Quicksort, Merge Sort, Binary Search, Linear Search
- **Domain-Tuned Usage**: Aggregation and memoization are tuned for election statistics and vote/result computations

### Data Structures Used

**Hash Maps (Dictionaries)**
- **Use**: Grouping and aggregation
- **Why**: O(1) average lookup time, efficient key-value storage
- **Implementation**: Python's built-in `dict` and `defaultdict`

**Lists/Arrays**
- **Use**: Sorting, searching, iteration
- **Why**: Sequential access, efficient indexing
- **Implementation**: Python's `list` type

**Sets**
- **Use**: Unique value storage, fast membership testing
- **Why**: O(1) average membership test
- **Implementation**: Python's built-in `set` type

### Performance Characteristics

**Best Case Scenarios**:
- Binary Search: O(log n) - extremely fast for sorted data
- Hash-based Grouping: O(n) - single pass through data

**Worst Case Scenarios**:
- Quicksort: O(n²) - rare, occurs with poor pivot selection
- Linear Search: O(n) - acceptable for unsorted data
- All other algorithms maintain their average-case complexity

**Space Efficiency**:
- Most algorithms: O(n) space complexity
- Memoization: O(k) where k = unique computations

### Real-World Applications in E-Botar

1. **Election Results Processing**: Quicksort for sorting candidates by vote count
2. **Election Statistics**: Aggregation for turnout and per-position totals
3. **Data Export Support**: Aggregation/sorting for export-ready datasets
4. **Data Export**: Efficient aggregation and sorting for PDF/CSV exports
5. **Search Functionality**: Binary search for fast student/candidate lookups
6. **Cache Management**: SHA-256 hashing for cache key generation
7. **Security**: SHA-256 hashing for vote receipt verification

### Algorithm Complexity Summary

| Algorithm | Time Complexity | Space Complexity | Type |
|-----------|----------------|------------------|------|
| Quicksort | O(n log n) avg, O(n²) worst | O(log n) | Sorting |
| Merge Sort | O(n log n) | O(n) | Sorting |
| Binary Search | O(log n) | O(1) | Searching |
| Linear Search | O(n) | O(1) | Searching |
| Hash Grouping | O(n) | O(n) | Grouping |
| Aggregation | O(n) | O(k) | Aggregation |
| SHA-256 Hash | O(n) | O(1) | Cryptographic |

*Where: n = number of items, k = unique categories*

---

## ✨ Key Features

### 🗳️ **Privacy-Preserving Voting**
- **Immediate Anonymization**: Votes are instantly separated from voter identity upon submission
- **Receipt-Based Verification**: Voters can verify participation through receipt code validation
- **Anonymous Tallying**: Results computed from anonymized vote records
- **Cryptographic Receipts**: SHA-256 hashed receipt verification workflow
- **One-Vote-Per-Election**: Database-level unique constraints prevent duplicate voting
- **Vote Verification**: Voters can retrieve recorded choices via their own receipt without exposing other voters

### 👥 **Comprehensive User Management**
- **JWT Authentication**: Stateless token-based authentication for scalability
- **Role-Based Access Control**: Three-tier role system (Student, Staff, Admin) with granular permissions
- **Student Profiles**: Complete academic information (department, course, year level)
- **Auto-Generated Student IDs**: Format YYYY-XXXXX (year + random digits)
- **Program Hierarchy**: Unified department/course structure with direct department linkage for courses
- **Profile Verification**: Admin-controlled verification system
- **Avatar Support**: Profile photo uploads with validation
- **Role Management**: Admins can change user roles through the user management interface

### 🏛️ **Flexible Election Management**
- **Multi-Election Support**: Manage concurrent and sequential elections
- **Precise Scheduling**: Start/end date-time with timezone support
- **Position Management**: Flexible position creation with custom ordering (no predefined type categories)
- **Automatic State Transitions**: Time-based election status (upcoming, active, finished)
- **Party System**: Support for registered parties with branding
- **Election Analytics**: Real-time statistics and voter turnout

### 🎯 **Smart Candidate Applications**
- **One Application Per Election**: Users can only submit one application per election, regardless of position
- **Application Workflow**: Complete submission, review, and approval process
- **Business Rules Enforcement**: No consecutive terms for same position
- **Position Change Process**: Users must withdraw existing application before applying for a different position in the same election
- **Party Restrictions**: One candidate per party per position per election
- **Bulk Review Operations**: Admin efficiency for high-volume applications
- **Application Tracking**: Pending, approved, rejected, withdrawn states
- **Manifesto System**: Detailed candidate platform descriptions
- **Photo & Document Upload**: Support for candidate materials

### 📊 **Results & Analytics**
- **Real-Time Results**: Live vote counting from anonymized records
- **Data Visualization**: Interactive charts and statistics
- **Multiple Export Formats**: CSV and JSON result exports
- **Turnout Analytics**: Voter participation metrics
- **Position-Level Statistics**: Detailed breakdown by position
- **Historical Data**: Complete election history preservation

### 🔒 **Enterprise-Grade Security**
- **JWT Token Security**: Access and refresh token rotation
- **Automatic Session Timeout**: Auto-logout after 5 minutes of user inactivity
  - Comprehensive activity tracking (mouse, keyboard, clicks, scroll, touch)
  - Handles tab/window visibility changes
  - Silent operation with automatic redirect to login
- **Role-Based Access Control (RBAC)**: Three-tier permission system with granular access control
  - **Student Role**: Can vote, apply as candidate, view own profile and applications
  - **Staff Role**: Can manage elections, review applications, view results, manage candidates (limited admin access)
  - **Admin Role**: Full system access including user management, role assignment, and all administrative functions
- **Security Event Logging**: Automatic capture of security incidents
- **Activity Audit Trails**: Complete logging of user actions including role changes
- **IP Address Tracking**: Request source logging for forensics
- **Failed Login Monitoring**: Suspicious activity detection
- **CSRF Protection**: Cross-site request forgery prevention
- **SQL Injection Prevention**: ORM-based query protection

### 🎨 **Modern User Experience**
- **Responsive Design**: Mobile-first approach with Bootstrap 5
- **RESTful API**: Clean, documented API for frontend consumption
- **React Dashboard**: Modern admin interface (in development)
- **Real-Time Feedback**: Comprehensive error handling and user guidance
- **Accessible Design**: WCAG compliance considerations
- **Progressive Enhancement**: Works across all modern browsers

---

## 🏗️ Architecture

### System Overview

E-Botar follows a modern **split-stack architecture** separating frontend and backend concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React 19 + Vite                                    │   │
│  │  - User Interface Components                        │   │
│  │  - Admin Dashboard                                  │   │
│  │  - JWT Token Management                             │   │
│  │  - API Client with Axios                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                     Backend Layer                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Django REST Framework                              │   │
│  │  - RESTful API Endpoints (50+)                      │   │
│  │  - JWT Authentication                               │   │
│  │  - Security Middleware                              │   │
│  │  - CORS Configuration                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer (5 Modules)                   │   │
│  │  - accounts: User management                        │   │
│  │  - elections: Election lifecycle                    │   │
│  │  - candidates: Application workflow                 │   │
│  │  - voting: Ballot & receipt management              │   │
│  │  - common: Security & utilities                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Data Layer                                         │   │
│  │  - Django ORM (18 Custom Models)                    │   │
│  │  - SQLite (Dev) / PostgreSQL (Production)           │   │
│  │  - Migration System                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Module Organization

```
E_Botar/
├── backend/                    # Django REST Framework Backend
│   ├── backend/                # Project configuration
│   │   ├── settings.py         # Django settings
│   │   ├── urls.py             # Main URL routing
│   │   └── wsgi.py             # WSGI application
│   ├── apps/                   # Application modules
│   │   ├── accounts/           # Authentication & user profiles
│   │   │   ├── models.py       # User, UserProfile, Program
│   │   │   ├── serializers.py  # JSON serialization
│   │   │   ├── views.py        # API endpoints
│   │   │   └── urls.py         # URL routing
│   │   ├── elections/          # Election management
│   │   │   ├── models.py       # Election, Position, Party
│   │   │   ├── serializers.py  # Election data serialization
│   │   │   ├── views.py        # CRUD operations
│   │   │   └── urls.py         # Election routes
│   │   ├── candidates/         # Candidate applications
│   │   │   ├── models.py       # Candidate, CandidateApplication
│   │   │   ├── serializers.py  # Application serialization
│   │   │   ├── views.py        # Application workflow
│   │   │   └── urls.py         # Candidate routes
│   │   ├── voting/             # Voting & results
│   │   │   ├── models.py       # VoteReceipt, Ballot, AnonVote
│   │   │   ├── serializers.py  # Vote data serialization
│   │   │   ├── views.py        # Voting operations
│   │   │   └── urls.py         # Voting routes
│   │   └── common/             # Security & utilities
│   │       ├── models.py       # SecurityEvent, ActivityLog
│   │       ├── middleware.py   # Security logging
│   │       └── utils.py        # Helper functions
│   ├── media/                  # User uploads (photos, documents)
│   ├── requirements.txt        # Python dependencies
│   └── manage.py               # Django management script
│
├── frontend/                   # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client services
│   │   └── utils/              # Helper functions
│   ├── package.json            # Node dependencies
│   └── vite.config.js          # Vite configuration
│
├── env/                        # Python virtual environment
│
├── docs/                       # Documentation
│   ├── Phase_Implementation.md # Implementation roadmap
│   ├── ADMIN_DASHBOARD_SPEC.md # Admin dashboard specification
│   └── PHASE1_COMPLETION_SUMMARY.md
│
├── CHANGELOG.md                # Version history
├── README.md                   # Quick start guide
├── Information.md              # Complete system information (this file)
└── .gitignore                  # Git ignore rules
```

### Frontend-Backend Connection Architecture

E-Botar uses a **service layer pattern** to connect the React frontend with the Django REST Framework backend through HTTP/REST APIs.

#### Connection Components

**1. API Service Instance** (`frontend/src/services/api.js`)
- **Component**: Axios HTTP client instance
- **Purpose**: Centralized API configuration and request handling
- **Base URL Logic**:
  - **Development**: Uses relative URL `/api` (proxied by Vite to `http://localhost:8000`)
  - **Production**: Uses `VITE_API_BASE_URL` environment variable
- **Features**:
  - Automatic JWT token injection via request interceptor
  - Automatic token refresh on 401 errors via response interceptor
  - 30-second timeout for requests
  - CORS error handling
  - Network error detection
- **Code Reference**: `frontend/src/services/api.js` (lines 41-147)

**2. Vite Development Proxy** (`frontend/vite.config.js`)
- **Component**: Vite proxy configuration
- **Purpose**: Routes `/api/*` requests to Django backend in development
- **Configuration**:
  ```javascript
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // Django backend
      changeOrigin: true,
      secure: false,
    },
  }
  ```
- **How it works**: 
  - Frontend runs on `http://localhost:5173`
  - Backend runs on `http://localhost:8000`
  - Request to `/api/auth/login/` → Proxied to `http://localhost:8000/api/auth/login/`
  - Eliminates CORS issues in development
- **Code Reference**: `frontend/vite.config.js` (lines 14-20)

**3. Service Layer** (`frontend/src/services/`)
- **Components**: Module-specific service files
  - `authService.js` - Authentication API calls
  - `electionService.js` - Election API calls
  - `candidateService.js` - Candidate API calls
  - `votingService.js` - Voting API calls
  - `programService.js` - Program management API calls
- **Pattern**: Each service imports the `api` instance and provides methods for specific endpoints
- **Example**:
  ```javascript
  import api from './api';
  
  export const authService = {
    login: (credentials) => {
      return api.post('/auth/token/', credentials);
    },
    getCurrentUser: () => {
      return api.get('/auth/me/');
    }
  };
  ```
- **Code Reference**: `frontend/src/services/authService.js` (example implementation)

**4. Request Interceptor** (`frontend/src/services/api.js`)
- **Component**: Axios request interceptor
- **Purpose**: Automatically adds JWT authentication token to all requests
- **Implementation**:
  ```javascript
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```
- **Result**: All API requests automatically include `Authorization: Bearer <token>` header
- **Code Reference**: `frontend/src/services/api.js` (lines 49-61)

**5. Response Interceptor** (`frontend/src/services/api.js`)
- **Component**: Axios response interceptor
- **Purpose**: Handles token refresh and error handling
- **Features**:
  - Detects 401 (Unauthorized) responses
  - Automatically refreshes JWT token using refresh token
  - Retries original request with new token
  - Redirects to login if refresh fails
  - Handles CORS and network errors
- **Code Reference**: `frontend/src/services/api.js` (lines 63-147)

**6. Backend CORS Configuration** (`backend/backend/settings.py`)
- **Component**: Django CORS middleware (`django-cors-headers`)
- **Development Configuration**:
  ```python
  CORS_ALLOW_ALL_ORIGINS = True  # Allows all origins in dev
  CORS_ALLOW_CREDENTIALS = True
  ```
- **Production Configuration**:
  ```python
  CORS_ALLOWED_ORIGINS = get_cors_origins()  # From FRONTEND_URL env var
  CORS_ALLOW_CREDENTIALS = True
  ```
- **Purpose**: Allows frontend to make cross-origin requests to backend API
- **Code Reference**: `backend/backend/settings.py` (lines 312-401)

**7. Backend URL Routing** (`backend/backend/urls.py`)
- **Component**: Django URL configuration
- **Structure**: All API endpoints prefixed with `/api/`
  ```python
  path("api/auth/", include("apps.accounts.urls")),      # /api/auth/*
  path("api/elections/", include("apps.elections.urls")), # /api/elections/*
  path("api/candidates/", include("apps.candidates.urls")), # /api/candidates/*
  path("api/voting/", include("apps.voting.urls")),      # /api/voting/*
  path("api/common/", include("apps.common.urls")),     # /api/common/*
  ```
- **Code Reference**: `backend/backend/urls.py` (lines 6-17)

#### Complete Request Flow

**Example: User Login Flow**

```
1. User Action
   ↓
   LoginPage.jsx: User clicks "Login" button
   
2. Service Call
   ↓
   authService.login({ username, password })
   
3. API Request
   ↓
   api.post('/auth/token/', { username, password })
   - Base URL: '/api' (dev) or VITE_API_BASE_URL (prod)
   - Full URL: http://localhost:8000/api/auth/token/
   
4. Request Interceptor
   ↓
   Adds headers: { 'Content-Type': 'application/json' }
   (No token needed for login)
   
5. Vite Proxy (Development Only)
   ↓
   Proxies /api/auth/token/ → http://localhost:8000/api/auth/token/
   
6. Backend CORS Middleware
   ↓
   Validates origin and allows request
   
7. Django URL Routing
   ↓
   Matches /api/auth/token/ → apps.accounts.urls → CustomTokenObtainPairView
   
8. Django REST Framework
   ↓
   - Validates credentials
   - Generates JWT tokens (access + refresh)
   - Returns JSON response
   
9. Response Interceptor
   ↓
   - Receives response with tokens
   - Stores tokens in localStorage
   - Returns response to service
   
10. Component Update
    ↓
    - Service returns token data
    - Component updates state
    - User redirected to dashboard
```

#### Environment Configuration

**Repository layout**: A single **`.env.example`** at the repository root (next to `README.md`) documents Django and Vite-related variables. Copy it to **`.env`** in that same folder.

**Django load order** (`backend/backend/settings.py`):
1. `E_Botar/.env` (repo root — path relative to `backend/` is `../.env` from `manage.py` working directory)
2. `E_Botar/backend/.env` — optional; if present, values **override** the root file

**Frontend (Vite)**: In development, the app uses the Vite dev proxy (`/api` → backend). For **`npm run build`**, set `VITE_API_BASE_URL` in **`frontend/.env`** or in the CI/shell environment (Vite loads `.env*` from `frontend/` by default, not the repo root).

**Frontend** (`frontend/.env` for production builds):
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

**Backend** (root `.env` and/or `backend/.env`; see root `.env.example` for full list):
```bash
SECRET_KEY=your-secret-key
DEBUG=True
# Frontend URL for CORS (examples)
FRONTEND_URL=http://localhost:5173
# FRONTEND_URL=http://localhost:5173,https://staging.example.com
```

#### Authentication Flow

**Token Management:**
1. **Login**: User logs in → Receives `access` token (30 min) and `refresh` token (1 day)
2. **Storage**: Tokens stored in `localStorage` with keys:
   - `access_token` - Short-lived access token
   - `refresh_token` - Long-lived refresh token
3. **Automatic Injection**: Request interceptor adds `Authorization: Bearer <access_token>` to all requests
4. **Automatic Refresh**: Response interceptor detects 401 errors and automatically refreshes token
5. **Logout**: Tokens cleared from `localStorage` on logout

**Code References:**
- API Service: `frontend/src/services/api.js`
- Vite Config: `frontend/vite.config.js`
- CORS Settings: `backend/backend/settings.py` (lines 312-401)
- URL Routing: `backend/backend/urls.py`
- Service Examples: `frontend/src/services/authService.js`, `electionService.js`, etc.

### Database Schema

#### Core Models (18 Custom Models)

**User Management** (3 models)
```
User (Django built-in)
├── UserProfile (1:1)
│   ├── student_id (unique, auto-generated)
│   ├── department → Program (FK, type=department)
│   ├── course → Program (FK, type=course)
│   ├── year_level, phone_number, avatar
│   └── is_verified (admission gate)
│
Program
├── program_type (department | course)
├── department → Program (FK, optional; course → department)
├── courses → Program (reverse FK)
└── code, description, is_active
```

**Election Management** (4 models)
```
SchoolElection
├── title (auto-generated using election type + academic year)
├── start_date, end_date
├── is_active
└── election_positions → ElectionPosition (1:Many)
    └── position → SchoolPosition (FK)

Party
├── name, description, logo, color
└── candidates, applications (reverse FK)

SchoolPosition
├── name
├── display_order
├── max_candidates
└── election_positions, candidates (reverse FK)
```

**Candidate System** (2 models)
```
CandidateApplication
├── user → User (FK)
├── position → SchoolPosition (FK)
├── election → SchoolElection (FK)
├── party → Party (FK, optional)
├── status (pending, approved, rejected, withdrawn)
├── manifesto, photo
├── submitted_at, reviewed_at, reviewed_by
└── candidate (1:1, created on approval)
└── [Unique constraint: (user, election) - one application per election]

Candidate
├── user → User (FK)
├── position → SchoolPosition (FK)
├── election → SchoolElection (FK)
├── party → Party (FK, optional)
├── approved_application → CandidateApplication (1:1)
├── manifesto, photo
└── is_active
```

**Privacy-Preserving Voting** (4 models)
```
VoteReceipt
├── user → User (FK)
├── election → SchoolElection (FK)
├── receipt_code (unique verification code)
├── receipt_hash (SHA-256 hash)
├── created_at, ip_address
└── [proves user voted, no vote choices]

Ballot
├── user → User (FK)
├── election → SchoolElection (FK)
├── receipt → VoteReceipt (1:1)
├── submitted_at, ip_address, user_agent
└── choices → VoteChoice (1:Many)
    └── [temporary, for verification only]

VoteChoice
├── ballot → Ballot (FK)
├── position → SchoolPosition (FK)
├── candidate → Candidate (FK)
└── [temporary storage before anonymization]

AnonVote
├── election → SchoolElection (FK)
├── position → SchoolPosition (FK)
├── candidate → Candidate (FK)
├── created_at
└── [NO user reference - anonymous tallying]
```

**Security & Audit** (2 models)
```
SecurityEvent
├── user → User (FK, optional)
├── event_type (login_attempt, failed_login, etc.)
├── severity (low, medium, high, critical)
├── description, ip_address, user_agent
├── metadata (JSON)
└── created_at

ActivityLog
├── user → User (FK, optional)
├── action, resource_type, resource_id
├── description, ip_address, user_agent
├── metadata (JSON)
└── timestamp
```


┌─────────────────────────────────────────────────────────┐
│ STEP 1: When Vote is Cast                               │
├─────────────────────────────────────────────────────────┤
│ Receipt Code: "abc123xyz"                               │
│           ↓                                             │
│ Hash Function (SHA-256)                                 │
│           ↓                                             │
│ Hash: "a665a45920422f9d417e4867efdc4fb8a04a1f3..."      │
│           ↓                                             │
│ Store in Database: receipt_hash = "a665a459..."         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ STEP 2: When Verifying Receipt                          │
├─────────────────────────────────────────────────────────┤
│ User Provides: "abc123xyz"                              │
│           ↓                                             │
│ Hash Function (SHA-256) - SAME FUNCTION                 │
│           ↓                                             │
│ New Hash: "a665a45920422f9d417e4867efdc4fb8a04a1f3..."  │
│           ↓                                             │
│ Compare: new_hash == stored_hash?                       │
│           ↓                                             │
│ ✅ MATCH → Valid Receipt                                │
│ ❌ NO MATCH → Invalid Receipt                           │
└─────────────────────────────────────────────────────────┘

### Privacy-Preserving Design

The voting system implements a **three-layer separation** for privacy:

1. **VoteReceipt**: Proves a user voted (without revealing choices)
2. **Ballot**: Encrypted personal copy for verification only
3. **AnonVote**: Anonymized votes for tallying (no user link)

**Flow**:
```
User submits ballot
    ↓
1. Create VoteReceipt (user + election, hashed receipt)
2. Create Ballot (submission record linked to receipt)
3. Create AnonVotes (one per position, NO user reference)
    ↓
Results computed from AnonVotes ONLY
```

This design ensures:
- ✅ Voter privacy (no link between user and vote in tallying)
- ✅ Individual verifiability (users can check vote participation via receipt validation)
- ✅ Audit trail (receipts prove participation without revealing votes)
- ✅ Transparent counting (AnonVotes are countable by anyone with DB access)

### Blockchain-Inspired Integrity Notes

- E-Botar is intentionally **blockchain-inspired**, not a distributed blockchain network.
- Integrity is enforced through cryptographic hashing, controlled write paths, and auditability.
- Governance trust is provided by authenticated roles, access controls, and logs rather than decentralized consensus nodes.
- This model is appropriate for campus-scale elections where transparency, privacy, and maintainability are all required.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 5.2.8
- **API**: Django REST Framework 3.16.1
- **Authentication**: djangorestframework-simplejwt 5.5.1 (JWT tokens)
- **Database**: SQLite (development), PostgreSQL (production-ready)
- **ORM**: Django ORM with migrations
- **CORS**: django-cors-headers for cross-origin requests
- **Image Processing**: Pillow 11.0+ for avatar/photo uploads
- **Environment**: python-dotenv for configuration
- **Encryption**: cryptography (Fernet) for ballot encryption

### Frontend
- **Framework**: React 19.2 with Hooks
- **Build Tool**: Vite 6.0 (fast HMR, optimized builds)
- **HTTP Client**: Axios with interceptors
- **Routing**: React Router 7.0
- **State Management**: React Context API + Hooks
- **Styling**: Bootstrap 5.3 + Custom CSS
- **Icons**: Font Awesome 6.x

### Security
- **Authentication**: JWT access + refresh tokens
- **Encryption**: Fernet symmetric encryption (Python cryptography)
- **Hashing**: SHA-256 for receipt codes, PBKDF2 for passwords
- **CORS**: Configured for frontend-backend separation
- **CSRF**: Django CSRF protection on state-changing operations
- **Validation**: Server-side validation with DRF serializers

### Development Tools
- **Version Control**: Git
- **Environment**: Python venv
- **Package Management**: pip (Python), npm (Node.js)
- **Code Quality**: Django system checks
- **Database Migrations**: Django migrations system
- **Performance Testing**: Built-in performance test suite, Locust for load testing
- **Throttling Management**: Management command for rate limit control

### Deployment Ready
- **WSGI Server**: Gunicorn (recommended)
- **Web Server**: Nginx (reverse proxy)
- **Database**: PostgreSQL (production)
- **Static Files**: WhiteNoise or Nginx
- **Media Files**: Local filesystem (development) or **Cloudinary** (production-recommended; auto-detected via `CLOUDINARY_URL`)
- **Environment**: .env configuration
- **Containerization**: Docker-ready architecture

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher (for frontend)
- **pip**: Python package installer
- **npm**: Node package manager
- **Git**: Version control

### Installation

#### 1. Clone the Repository

```powershell
git clone <repository-url>
cd "E_Botar"
```

#### 2. Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv ../env

# Activate virtual environment (Windows PowerShell)
..\env\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Environment variables (create before migrate)
# Copy ../.env.example to ../.env (repository root), e.g. from backend folder:
#   copy ..\.env.example ..\.env
# Django loads: ../.env first, then backend/.env if present (backend overrides).
# Configure at minimum: SECRET_KEY; optional: DATABASE_URL, FERNET_KEY, CORS/FRONTEND URLs per .env.example comments

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
# OR use the superuser command:
python manage.py superuser --username admin --email admin@example.com

# Run development server
python manage.py runserver
```

**Backend will run on**: `http://localhost:8000`

#### 3. Frontend Setup

```powershell
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install

# Optional: frontend/.env for production builds (Vite reads env from frontend/ by default)
# Dev uses Vite proxy to /api — see vite.config.js. For production:
#   VITE_API_BASE_URL=http://127.0.0.1:8000
# Root .env.example documents the same variable for reference.

# Run development server
npm run dev
```

**Frontend will run on**: `http://localhost:5173`

### Quick Start Commands

**Start Backend**:
```powershell
cd backend
..\env\Scripts\Activate.ps1
python manage.py runserver
```

**Start Frontend**:
```powershell
cd frontend
npm run dev
```

### Initial Configuration

1. **Create Programs (Departments & Courses)**:
   - Access: `http://localhost:8000/admin/`
   - Navigate to Accounts → Programs
   - Add department-type programs (e.g., "Computer Studies")
   - Add course-type programs and set their parent department

2. **Create Super Admin (optional shortcut)**:
   ```powershell
   cd backend
   ..\env\Scripts\Activate.ps1
   python manage.py superuser --username admin --email admin@example.com
   ```
   - You can also set `SUPERUSER_USERNAME`, `SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD` env vars
   - Omit `--password` to be prompted or auto-generate a secure password

3. **Create Parties** (optional):
   - Navigate to Elections → Parties
   - Create political parties with names, colors, logos

4. **Create Positions**:
   - Navigate to Elections → School Positions
   - Create positions (President, Vice President, etc.)

5. **Create Election**:
   - Navigate to Elections → School Elections
   - Set start year and end year (auto-generates title)
   - Set start_date and end_date for voting period
   - Add positions to the election

6. **Ready to Use**:
   - Students can register via API
   - Admins can verify students
   - Candidates can apply (when election is upcoming)
   - Voting begins when election is active

---

## 📡 API Documentation

**HTML API Guide:** When only the backend is accessible, a full API reference is served at **`/guide/`** (e.g. `https://your-api.com/guide/`). The frontend also provides an API guide at the `/guide` route with a link in the footer.

### Base URL
```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

### Authentication

**Obtain JWT Token**:
```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "student123",
  "password": "password123"
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Refresh Token**:
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Use Token in Requests**:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Google Sign-In** (after configuring **django-allauth** `SocialApp` for provider `google` plus matching frontend **`VITE_GOOGLE_CLIENT_ID`**):

```http
POST /api/auth/google/
Content-Type: application/json

{
  "access_token": "<Google OAuth access token from Identity Services>",
  "credential": "<optional ID token JWT in alternative flows>",
  "password": "<required when linking to existing account after 409 requires_password>"
}
```

Successful responses return **`access`** / **`refresh`** JSON in the same shape as **`POST /api/auth/token/`**. Responses may return **`403`** when Google email is unverified; **`409`** with **`requires_password: true`** for linking; **`409`** with **`code: ambiguous_email_accounts`** when multiple Django users share the same verified email (admin must deduplicate accounts); credential/auth failures use **`401`** / **`400`** as appropriate (**[CHANGELOG.md](CHANGELOG.md)** **2.1.0** § Fixed).

### API Modules

#### Global endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health/` | GET | Public | Consolidated health check (alias: `/api/common/health/`) |
| `/api/version/` | GET | Public | API and backend version coordination |

#### 1. Accounts Module (`/api/auth/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register/` | POST | Public | User registration |
| `/token/` | POST | Public | Obtain JWT token |
| `/token/refresh/` | POST | Public | Refresh JWT token |
| `/google/` | POST | Public | Google Sign-In: body `credential` (ID JWT) **or** `access_token` (OAuth); optional `password` when linking (`requires_password`); responds with JWT pair or link requirements |
| `/me/` | GET | Authenticated | Current user profile |
| `/departments/` | GET | Public | List departments |
| `/departments/` | POST | Superuser | Create department |
| `/courses/` | GET | Public | List courses |
| `/courses/` | POST | Superuser | Create course |
| `/profiles/` | GET | Authenticated | List user profiles (staff/admin see all) |
| `/profiles/{id}/` | GET | Authenticated | Get user profile |
| `/profiles/{id}/` | PATCH | Authenticated | Update profile |
| `/profiles/{id}/toggle_active/` | POST | Superuser | Toggle user active status |
| `/profiles/{id}/reset_password/` | POST | Superuser | Reset user password |
| `/profiles/{id}/update_role/` | POST | Superuser | Update user role (Student/Staff/Admin) |
| `/student-count/` | GET | Authenticated | Get total student count (non-staff/non-admin users) |

#### 2. Elections Module (`/api/elections/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/parties/` | GET | Public | List parties |
| `/parties/` | POST | Superuser | Create party |
| `/positions/` | GET | Public | List positions |
| `/positions/` | POST | Superuser | Create position |
| `/elections/` | GET | Public | List elections |
| `/elections/` | POST | Staff/Admin | Create election (staff can create) |
| `/elections/{id}/` | GET | Public | Get election details |
| `/elections/active/` | GET | Public | Get active elections |
| `/elections/upcoming/` | GET | Public | Get upcoming elections |
| `/elections/finished/` | GET | Public | Get finished elections |
| `/elections/{id}/add_position/` | POST | Staff/Admin | Add position to election |
| `/elections/{id}/remove_position/` | POST | Staff/Admin | Remove position from election |

#### 3. Candidates Module (`/api/candidates/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/candidates/` | GET | Public | List approved candidates |
| `/candidates/by_election/` | GET | Public | Filter candidates by election |
| `/applications/` | GET | Authenticated | List applications (own or all) |
| `/applications/` | POST | Authenticated | Submit application |
| `/applications/{id}/` | GET | Authenticated | Get application details |
| `/applications/my_applications/` | GET | Authenticated | Get user's applications |
| `/applications/pending/` | GET | Staff/Admin | Get pending applications |
| `/applications/{id}/review/` | POST | Staff/Admin | Review application |
| `/applications/bulk_review/` | POST | Staff/Admin | Bulk review applications |
| `/applications/{id}/withdraw/` | POST | Authenticated | Withdraw application |

#### 4. Voting Module (`/api/voting/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/ballots/` | GET | Authenticated | List user's ballots |
| `/ballots/submit/` | POST | Authenticated | Submit ballot |
| `/ballots/my_ballot/` | GET | Authenticated | Get ballot for election |
| `/receipts/` | GET | Authenticated | List user's receipts |
| `/receipts/my_receipts/` | GET | Authenticated | Get user's receipts |
| `/receipts/verify/` | POST | Authenticated | Verify receipt code |
| `/results/election_results/` | GET | Public* | Get election results |
| `/results/my_vote_status/` | GET | Authenticated | Check vote status |
| `/results/export_results/` | GET | Superuser | Export results (CSV/JSON) |
| `/results/statistics/` | GET | Public* | Get election statistics |


# Configurable Branding (Multi-School Template)

The E-Botar system supports configurable institution branding so the same codebase can be used by different schools. Logo and institution name are read from **System Settings** and exposed via a public API.

## API

- **GET** `/api/common/branding/` (no auth)
- Returns: `institution_name`, `institution_name_line2`, `institution_logo_url`, `app_name`, `institution_full_name`

## Configuring branding (Django Admin)

1. Go to **Django Admin** → **Common** → **System Settings**.
2. Add or edit the following keys:

| Key | Description | Example |
|-----|-------------|---------|
| `institution_name` | First line of institution name (e.g. school name) | `SURIGAO DEL NORTE` |
| `institution_name_line2` | Second line (e.g. "STATE UNIVERSITY") | `STATE UNIVERSITY` |
| `institution_logo` | Optional. Path to logo file under media (e.g. `institution/logo.png`). Leave empty to use the default bundled logo. | `institution/logo.png` |
| `app_name` | Application name shown in UI | `E-Botar` |

3. **Logo file**: To use a custom logo, upload the image to your media root under a path like `institution/logo.png`, then set `institution_logo` to `institution/logo.png`. Ensure `BACKEND_BASE_URL` (or your frontend API base) points to the backend so the logo URL is correct.
   - Tip: `institution_logo` may also be a full **absolute URL** (e.g. a Cloudinary or CDN URL like `https://res.cloudinary.com/<cloud>/image/upload/v.../logo.png`). When the value starts with `http://` or `https://`, the API returns it unchanged.

## Defaults

If a key is missing, the API returns these defaults (current SNSU branding):

- `institution_name`: `SURIGAO DEL NORTE`
- `institution_name_line2`: `STATE UNIVERSITY`
- `institution_logo_url`: `null` (frontend uses bundled default logo)
- `app_name`: `E-Botar`

No database migration is required; defaults are applied in code.

## Maintenance: Feature availability (temporary disables)

Superusers can temporarily disable parts of the public/admin UI using the **Feature availability** screen:

- URL: `/admin/maintenance/features`
- What it changes: backend `feature_flags` stored in **System Settings** (and returned via `GET /api/common/branding/`).

Common toggles:

- **Public registration** (`user_registration`): disables `/register` and removes the register call-to-action from the Login page.
- **Google sign-in** (`google_login`): disables and visually greys out **“Continue with Google”** on the Login page.
- **Data export** (`data_export`): controls whether export navigation/actions are available for staff/admin flows.
- **Staff preview** (`staff_preview_disabled_features`): when enabled, staff can still *see* muted (disabled) navigation entries while actual route access remains blocked.

Note: username/password sign-in remains available; this maintenance screen is intended for safe temporary access control during incidents or rehearsals.

## Media storage (uploads)

E-Botar accepts user-uploaded media in four places:

| Field | Model | Folder / public_id prefix | Filename |
|-------|-------|---------------------------|----------|
| `avatar` | `apps.accounts.UserProfile` | `profile_photos/` | `<student_id>.<ext>` |
| `photo` | `apps.candidates.Candidate`, `apps.candidates.CandidateApplication` | `candidate_photos/` | `<student_id>.<ext>` |
| `supporting_documents` | `apps.candidates.CandidateApplication` | `candidate_docs/` | original filename |
| `logo` | `apps.elections.Party` | `party_logos/` | original filename |

### Avatar / candidate photo filenames follow the student ID

Avatars and candidate photos are automatically renamed to match the user's
**`student_id`** on every upload. The path generators live in
[`apps.common.files.upload_paths`](backend/apps/common/files/upload_paths.py):

| Source | Resolved path |
|--------|---------------|
| `UserProfile.avatar` | `profile_photos/<student_id>.<ext>` |
| `Candidate.photo`, `CandidateApplication.photo` | `candidate_photos/<student_id>.<ext>` |

If `student_id` is empty (typical for staff / superuser accounts), the
filename falls back to the user's slugified `username`, then their `pk`.

**When `student_id` changes**, `UserProfile.save()` re-feeds each affected
file's bytes through Django's normal `FileField` pipeline. The avatar is
reassigned as a fresh `ContentFile` and saved; each candidate photo is
deleted and re-saved. Because both paths route through `upload_to` again,
the new file lands at `<folder>/<new_student_id>.<ext>` automatically — no
custom rename plumbing is involved. Works identically on the local
filesystem in development and on Cloudinary (inside the configured
`CLOUDINARY_FOLDER`) in production.

Because each user has exactly one avatar path (`<student_id>.jpg`),
re-uploads naturally overwrite the previous file instead of leaving orphans.

### Local development (default)

No configuration needed. Files are written to **`backend/media/`** and served by Django at `MEDIA_URL = /media/` while `DEBUG=True`. The path is gitignored.

### Production: Cloudinary (recommended)

Most low-cost hosts (e.g. Railway free/hobby) use **ephemeral filesystems** — anything written to `backend/media/` disappears on the next redeploy. To keep uploads persistent, configure **Cloudinary**:

1. Create a free account at <https://cloudinary.com> and copy your **API Environment variable** from the dashboard. It looks like:
   ```
   CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
   ```
2. Set it in your deployment environment (Railway → *Variables*, or a `.env` for self-hosting). Alternatively, set the three values separately:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
3. *(Optional)* Choose the **folder name** inside your Cloudinary Media Library where E-Botar uploads should land. The default is **`E-Botar`** (matching the project name). To override, set:
   ```
   CLOUDINARY_FOLDER=E-Botar
   ```
   Leave blank to upload to the cloud root. Final Cloudinary public IDs follow the pattern `media/<CLOUDINARY_FOLDER>/<upload_to>/<student_id>` — for example `media/E-Botar/profile_photos/2024-12345`. The leading `media/` is the default `django-cloudinary-storage` `PREFIX` (it mirrors Django's `MEDIA_URL`), and is kept on purpose so the Cloudinary layout matches the local-filesystem layout — flipping the project back to local storage requires no rename. Cloudinary creates the folders implicitly on first upload, so no manual folder setup is required.
4. Redeploy. Django automatically detects the env vars and switches the **default file storage** to `apps.common.files.storage.ResilientMediaCloudinaryStorage`. New uploads (avatars, candidate photos, supporting documents, party logos) go to your Cloudinary account inside the configured folder; URLs returned by API serializers point to `https://res.cloudinary.com/...`.
5. Existing files already on disk are **not** auto-migrated. Re-upload through the app, or write a one-off script if you need to bring historical media across.

When Cloudinary is configured, the public branding logo (`SystemSettings.institution_logo`) can be set to either a Cloudinary URL directly, a media-relative path, or left empty. The branding API (`GET /api/common/branding/`) auto-resolves the URL in this order:

1. Empty value → `null` (frontend uses the bundled default logo).
2. Absolute URL (`http://` / `https://`) → returned unchanged.
3. Relative path **that exists on the local filesystem** (`MEDIA_ROOT/<path>`) → returned as a local URL using `BACKEND_BASE_URL` + `MEDIA_URL`.
4. Relative path with **Cloudinary configured** → returned as the Cloudinary URL via `default_storage`.
5. Otherwise → `null`.

In other words: the branding API picks **whichever source actually has the file** — local or Cloudinary — depending on which is available.

### When Cloudinary is unavailable

If Cloudinary is configured but a user's upload attempt fails (network outage, wrong credentials, Cloudinary downtime, rate-limited API), E-Botar **does not** show a server error. The DRF exception handler in [`apps/common/http/exception_handlers.py`](backend/apps/common/http/exception_handlers.py) returns a clean response:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "detail": "Unavailable at the moment.",
  "code": "media_upload_unavailable"
}
```

The existing frontend forms (`ProfileEditPage`, `ApplicationFormPage`) read `detail` first and display it in their alert / inline error UI — users see exactly **"Unavailable at the moment."** Read operations (showing existing avatars, candidate photos) keep their default behavior; the frontend already falls back to bundled placeholders when an image URL fails to load.

To diagnose Cloudinary failures, check the backend logs for entries from `apps.common.files.storage` (`Cloudinary media upload failed for ...`).

### Operations

- **Cleanup orphans**: `python manage.py cleanup_unused_media` (supports `--dry-run`) deletes files in `profile_photos/` and `candidate_photos/` that are no longer referenced by any model. Works on both local filesystem and Cloudinary because it operates through Django's `default_storage`.
- **Backups**: Cloudinary keeps its own asset history; the management command only removes orphans, never referenced media.

*Public after election ends, Admin anytime

### Example API Calls

**Register User**:
```javascript
POST /api/auth/register/
{
  "username": "student123",
  "email": "student@snsu.edu.ph",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Submit Candidate Application**:
```javascript
POST /api/candidates/applications/
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "election": 1,
  "position": 2,
  "party": 1,
  "manifesto": "My campaign platform...",
  "photo": <file>
}
```

**Submit Ballot**:
```javascript
POST /api/voting/ballots/submit/
Authorization: Bearer <token>
{
  "election_id": 1,
  "votes": [
    {"position_id": 1, "candidate_id": 5},
    {"position_id": 2, "candidate_id": 8},
    {"position_id": 3, "candidate_id": 12}
  ]
}

Response:
{
  "detail": "Ballot submitted successfully.",
  "ballot_id": 42,
  "receipt_code": "ABC1...XYZ9"
}
```

**Get Election Results**:
```javascript
GET /api/voting/results/election_results/?election_id=1

Response:
[
  {
    "position_id": 1,
    "position_name": "President",
    "total_votes": 150,
    "candidates": [
      {
        "candidate_id": 5,
        "candidate_name": "Jane Smith",
        "party": "Progressive Party",
        "vote_count": 85,
        "percentage": 56.67
      },
      ...
    ]
  },
  ...
]
```

**Update User Role**:
```javascript
POST /api/auth/profiles/{id}/update_role/
Authorization: Bearer <admin_token>
{
  "role": "staff"
}

Response:
{
  "message": "User role updated to staff successfully",
  "profile": {
    "user": {
      "role": "staff",
      ...
    },
    ...
  }
}
```

### Error Responses

**Standard Error Format**:
```json
{
  "detail": "Error message here"
}
```

**Validation Errors**:
```json
{
  "field_name": ["Error message for this field"]
}
```

**HTTP Status Codes**:
- `200 OK`: Successful request
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## 🔒 Security Features

### Authentication & Authorization

**JWT Token Security**:
- Access tokens expire after 30 minutes
- Refresh tokens expire after 1 day
- Tokens include user ID and expiration
- Token rotation on refresh
- **Automatic Session Timeout**: Frontend implements 5-minute inactivity detection that auto-logs out users regardless of token validity
  - Tracks user activity (mouse, keyboard, clicks, scroll, touch)
  - Handles tab/window visibility changes
  - Silent operation with automatic redirect to login

**Role-Based Access Control (RBAC)**:
- **Public**: Read-only access to elections, candidates, results (after election ends)
- **Student** (`is_staff=False`, `is_superuser=False`):
  - Submit ballots during active elections
  - Apply as candidate (one application per election)
  - View own profile, applications, and vote receipts
  - Verify own ballot using receipt code
- **Staff** (`is_staff=True`, `is_superuser=False`):
  - All Student permissions, plus:
  - Access Admin Dashboard
  - Manage elections (create, edit, activate/deactivate)
  - Review and approve/reject candidate applications
  - View election results and statistics
  - Manage candidates and parties
  - View all user profiles (without sensitive fields)
  - Cannot access: User Management, System Logs, Role Management, Password Reset, Export Results
- **Admin** (`is_superuser=True`, `is_staff=True`):
  - All Staff permissions, plus:
  - User management (activate/deactivate users, reset passwords)
  - Role management (assign Student/Staff/Admin roles)
  - Full system configuration access
  - Export election results
  - Access Django admin panel
  - View System Logs and Activity Logs

### Data Protection

**Cryptography & Protection**:
- Receipt codes verified through SHA-256 hash workflow
- Passwords hashed with PBKDF2 (Django default)
- Role-based authorization and audit logging protect election operations

**Privacy Measures**:
- Immediate vote anonymization upon submission
- No linkage between user and vote in tallying database
- Anonymous vote records for results computation
- Encrypted ballot storage for personal verification only

**Input Validation**:
- Server-side validation on all inputs
- DRF serializers for type checking
- Custom validators for business rules
- File upload validation (size, type)

### Audit & Monitoring

**Activity Logging**:
- All user actions logged with timestamp
- IP address and user agent captured
- Request method and path recorded
- Status codes logged for analysis
- Role changes logged with metadata

**Security Event Logging**:
- Failed login attempts tracked
- Suspicious activity flagged
- Unauthorized access attempts logged
- System errors captured with context

**Access Attempt Tracking**:
- Username attempts recorded
- Success/failure status logged
- IP-based rate limiting ready
- Forensic data for security analysis

### Session Management

**Automatic Session Timeout**:
- Frontend-based inactivity detection (5-minute timeout)
- Comprehensive activity tracking: mouse movements, keyboard input, clicks, scroll, touch events
- Tab/window visibility handling: pauses timer when tab is hidden, checks timeout when tab becomes active
- Silent operation: automatic logout without warnings or notifications
- Automatic redirect to login page after timeout
- Works independently of JWT token expiration for enhanced security

### Application Security

**CSRF Protection**:
- Django CSRF middleware active
- CSRF tokens on all state-changing operations
- Token validation on POST/PUT/PATCH/DELETE

**SQL Injection Prevention**:
- Django ORM parameterized queries
- No raw SQL without sanitization
- Input sanitization at serializer level

**XSS Prevention**:
- React auto-escapes output
- Django template auto-escaping (if used)
- Content Security Policy headers (recommended)

**CORS Configuration**:
- Whitelist specific frontend origins
- Credentials support for JWT cookies (optional)
- Preflight request handling

---

## 👥 User Workflows

### Student Workflow

```
1. Register Account
   └─> POST /api/auth/register/
       ├─ Provide: username, email, password, name, academic info
       └─ Receive: User account created

2. Login
   └─> POST /api/auth/token/
       ├─ Provide: username, password
       └─ Receive: JWT access + refresh tokens

3. Complete Profile (if needed)
   └─> PATCH /api/auth/profiles/{id}/
       ├─ Update: department, course, year_level, avatar
       └─ Wait for admin verification

4. Apply as Candidate (when election is upcoming)
   └─> POST /api/candidates/applications/
       ├─ Select: election, position, party (optional)
       ├─ Upload: photo, manifesto
       └─ Wait for admin review
       └─ Note: Only one application per election allowed

5. Vote (when election is active)
   └─> POST /api/voting/ballots/submit/
       ├─ Select one candidate per position
       └─ Receive: Vote receipt code

6. Verify Vote
   └─> POST /api/voting/receipts/verify/
       ├─ Provide: receipt code
       └─ Confirm: Vote was recorded

7. View Results (after election ends)
   └─> GET /api/voting/results/election_results/?election_id={id}
       └─ See: Vote counts and percentages
```

### Staff Workflow

```
1. Login as Staff
   └─> POST /api/auth/token/
       └─ Use: Staff credentials (is_staff=True, is_superuser=False)

2. Manage Elections
   └─> POST /api/elections/elections/
       ├─ Create new elections
       ├─ Add positions to elections
       └─ Activate/deactivate elections

3. Review Candidate Applications
   └─> GET /api/candidates/applications/pending/
       └─> POST /api/candidates/applications/{id}/review/
           ├─ Action: approve or reject (reject requires review notes)
           └─ Automatic: Candidate record created on approval

4. View Results & Statistics
   └─> GET /api/voting/results/statistics/?election_id={id}
       └─ See: Turnout, participation metrics

5. Manage Candidates and Parties
   └─> Access candidate and party management endpoints
```

### Admin Workflow

```
1. Login as Admin
   └─> POST /api/auth/token/
       └─ Use: Admin credentials (is_superuser=True)

2. Setup Academic Structure
   └─> POST /api/auth/departments/
       └─> POST /api/auth/courses/
           └─ Create departments and courses

3. Manage User Roles
   └─> POST /api/auth/profiles/{id}/update_role/
       ├─ Assign: Student, Staff, or Admin role
       └─ Role changes logged in ActivityLog

4. User Management
   └─> POST /api/auth/profiles/{id}/toggle_active/
       └─> POST /api/auth/profiles/{id}/reset_password/
           └─ Activate/deactivate users, reset passwords

5. Create Election
   └─> POST /api/elections/elections/
       ├─ Set: start_year, end_year, dates
       └─> POST /api/elections/elections/{id}/add_position/
           └─ Add positions to election

6. Review Candidate Applications
   └─> GET /api/candidates/applications/pending/
       └─> POST /api/candidates/applications/{id}/review/
           ├─ Action: approve or reject
           └─ Automatic: Candidate record created on approval

7. Monitor Voting
   └─> GET /api/voting/receipts/
       └─ View: Vote receipts and timestamps

8. View Results & Statistics
   └─> GET /api/voting/results/statistics/?election_id={id}
       └─ See: Turnout, participation metrics

9. Export Results
   └─> GET /api/voting/results/export_results/?election_id={id}&format=csv
       └─ Download: CSV or JSON file
```

---

## 🔧 Development

### Project Structure

```
backend/
├── apps/
│   ├── accounts/       # User management
│   ├── elections/      # Election management
│   ├── candidates/     # Candidate applications
│   ├── voting/         # Voting & results
│   └── common/         # Security & utilities
├── backend/
│   ├── settings.py     # Configuration
│   └── urls.py         # URL routing
├── media/              # User uploads
├── manage.py           # Django CLI
└── requirements.txt    # Dependencies

frontend/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── services/       # API client
│   └── utils/          # Helpers
├── package.json        # Dependencies
└── vite.config.js      # Vite config
```

### Running Tests

```powershell
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test

# Performance tests
python performance_tests.py

# Algorithm tests
python test_algorithms.py
```

### Performance Testing

**Built-in Performance Test Suite**:
```powershell
# Run comprehensive performance tests
python performance_tests.py

# Quick performance test
python quick_performance_test.py
```

**Load Testing with Locust**:
```powershell
# Install Locust (if not installed)
pip install locust

# Run load test
locust -f locustfile.py --host=http://localhost:8000

# Open browser to http://localhost:8089 for web interface
```

**Performance Metrics Tracked**:
- Response time (average, median, P95, P99)
- Throughput (requests per second)
- Error rate and success rate
- Database query performance
- Algorithm performance benchmarks
- Overall API quality score (0-100)

### Management Commands

**Throttling Management**:
```powershell
# Reset throttling for all users
python manage.py reset_throttling

# Reset throttling for specific user
python manage.py reset_throttling --username test_user
```

**Other Useful Commands**:
```powershell
# Create test user for load testing
python create_test_user.py

# System check
python manage.py check

# Show migrations status
python manage.py showmigrations
```

### Database Management

**Create Migration**:
```powershell
python manage.py makemigrations
```

**Apply Migrations**:
```powershell
python manage.py migrate
```

**Database Shell**:
```powershell
python manage.py dbshell
```

**Django Shell**:
```powershell
python manage.py shell
```

### Debugging

**Django Debug Mode**:
- Set `DEBUG = True` in settings.py (development only)
- View detailed error pages
- Django Debug Toolbar (install separately)

**API Testing**:
- DRF Browsable API: `http://localhost:8000/api/`
- Postman/Insomnia for API testing
- curl commands for quick tests

### Code Quality

**Django System Check**:
```powershell
python manage.py check
```

**Check Migrations**:
```powershell
python manage.py showmigrations
```

**Static Analysis** (recommended):
```powershell
pip install pylint
pylint apps/
```

---

## 📚 Documentation

### Available Documentation

- **[README.md](README.md)** - Quick start guide and overview
- **[Document.md](Document.md)** - Handbook for setting up and using the system (installation, configuration, roles, troubleshooting); structured per project documentation guidelines
- **[Information.md](Information.md)** - Complete system information (this file)
- **[Phase_Implementation.md](Phase_Implementation.md)** - Implementation roadmap and progress
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[ADMIN_DASHBOARD_SPEC.md](ADMIN_DASHBOARD_SPEC.md)** - React admin dashboard specification
- **[PHASE1_COMPLETION_SUMMARY.md](PHASE1_COMPLETION_SUMMARY.md)** - Phase 1 completion details
- **[PHASE2_DEFERRED_FEATURES.md](PHASE2_DEFERRED_FEATURES.md)** - Features for future implementation

### Documentation map

| Audience / need | Primary doc | Also useful |
|----------------|-------------|-------------|
| Install and day-to-day use (any role) | [Document.md](Document.md) | [README.md](README.md), this file § Getting Started |
| Technical depth, APIs, architecture | This file ([Information.md](Information.md)) | HTML API guide at `/guide/` ([README](README.md) overview) |
| Release notes | [CHANGELOG.md](CHANGELOG.md) | [README.md](README.md) highlights |
| Phasing and backlog | [Phase_Implementation.md](Phase_Implementation.md) | [PHASE2_DEFERRED_FEATURES.md](PHASE2_DEFERRED_FEATURES.md) |

When you change behavior or configuration, record it in **[CHANGELOG.md](CHANGELOG.md)**; for phased work, mirror progress in **[Phase_Implementation.md](Phase_Implementation.md)**. Prefer updating **[README.md](README.md)** for user-visible highlights and this file for deep technical detail.

### Active codebase layout (reference)

Operations and tooling assume this monorepo layout:

- **Project root**: repository folder containing `backend/`, `frontend/`, and shared docs.
- **Backend**: `backend/` (`manage.py`, Django apps under `backend/apps/` or as structured in the repo).
- **Frontend**: `frontend/` (React + Vite).
- **Python virtual environment**: create at **`env/`** beside `backend/` (e.g. `python -m venv ../env` from `backend/`); activate before `python`, `pip`, or `manage.py` so dependencies match [requirements.txt](backend/requirements.txt).

### Quick Reference

**For Developers**:
1. Start with [Phase_Implementation.md](Phase_Implementation.md) for architecture overview
2. Reference [Information.md](Information.md) for complete API documentation
3. Check [CHANGELOG.md](CHANGELOG.md) for recent changes

**For Administrators**:
1. Review [README.md](README.md) for quick start
2. Follow Getting Started guide in [Information.md](Information.md) for installation
3. Use User Workflows section for daily operations

**For Researchers**:
1. Research Foundation section explains academic basis
2. Privacy-Preserving Design details voting architecture
3. Security Features section covers cryptographic implementations

---

## 🗺️ Roadmap

### Current Version: 2.1.0
- ✅ Complete Backend API modules (accounts, elections, candidates, voting, common)
- ✅ User authentication and profiles
- ✅ Three-tier role system (Student, Staff, Admin)
- ✅ Role management interface
- ✅ Proper permission system with custom permission classes
- ✅ Staff access to admin panels (election management, application review)
- ✅ Admin-only restrictions (user management, system logs)
- ✅ Data privacy protection (sensitive fields hidden from non-admins)
- ✅ Election management with USC and Department Election types
- ✅ Eligibility system for voting and candidate applications
- ✅ Candidate applications (one per election)
- ✅ Privacy-preserving voting
- ✅ Results and analytics
- ✅ Security logging with consolidated system logs API
- ✅ Complete React frontend (all modules functional)
- ✅ Production deployment configuration (Vercel, Railway, etc.)
- ✅ Production API fixes and error handling
- ✅ Automatic token refresh system
- ✅ Program Management Module (departments and courses CRUD)
- ✅ CSV Import/Export for programs
- ✅ Party Management interface
- ✅ Position Management interface
- ✅ Enhanced Data Export System (PDF exports with categorization)
- ✅ Form submission throttling (rate limiting)
- ✅ Admin profile flexibility (optional academic info for admins)
- ✅ Dashboard improvements (Current Administration display)
- ✅ Algorithm Library (sorting, searching, aggregation, memoization, cryptographic)
- ✅ Algorithm integration in voting, election, and data processing modules
- ✅ Performance testing suite with algorithm benchmarks and API testing
- ✅ Load testing configuration with Locust
- ✅ Throttling management command for testing and development
- ✅ Memoization for expensive operations in services
- ✅ Aggregation algorithms for vote counting and statistics
- ✅ Profile completeness validation system (candidate applications and voting)
- ✅ Results visibility controls (hidden during active elections for non-admins)
- ✅ Student count endpoint for accurate statistics
- ✅ Guest mode privacy (statistics hidden for unauthenticated users)
- ✅ Position management improvements (auto-assignment, smart reordering)
- ✅ Candidate directory enhancements (course/year display, visual updates)
- ✅ Google Sign-In (OAuth/OpenID flows; JWT issuance; django-allauth Social Apps; frontend Google Identity Services; account linking via password modal)

### Next: Version 1.2.x
- 🔄 Enhanced data visualizations
- 🔄 Advanced analytics dashboard
- 🔄 Additional performance optimizations
- 🔄 Extended testing suite (unit tests, integration tests)

### Future / deferred (beyond v2.1.0)
- 📋 Email notification system (P1 deferred feature)
- 📋 Analytics & reporting dashboard (P2 deferred feature)
- 📋 Rate limiting & advanced security (P2 deferred feature)
- 📋 Management commands (bulk operations) (P2 deferred feature)
- 📋 Testing infrastructure (unit + E2E tests) (P2 deferred feature)

### Long-term Goals (Version 2.0+)
- 📋 WebSocket real-time updates (P3 deferred feature)
- 📋 Progressive Web App (PWA) (P3 deferred feature)
- 📋 Mobile app (React Native)
- 📋 Biometric authentication
- 📋 Advanced fraud detection with ML
- 📋 Multi-institution support
- 📋 External audit tools
- 📋 Expanded blockchain-inspired integrity controls (beyond current **VoteBlock** ledger / verification)


**Integrity note**: The **`VoteBlock`** append-only ledger and verification shipped in **v2.1.0** satisfy the thesis “block-style” voting trail; roadmap items labeled “blockchain-inspired” may refine audit UX or federation rather than repeating the ledger feature.

---

## 📜 License

This system is **proprietary software** developed as part of academic research for educational institution use.

**Copyright © 2024-2025**. All rights reserved.

### Usage Terms
- Developed for thesis research purposes
- Intended for educational institution deployment
- Commercial use requires separate licensing
- Modifications must maintain security and privacy guarantees

### Academic Use
- May be referenced in academic research
- Code examples may be used with proper citation
- Deployment for research purposes permitted

### Contact
For licensing inquiries or collaboration opportunities, please contact the development team.

---

## 🙏 Acknowledgments

### Academic Foundation
- Thesis advisors for research guidance
- Academic institution for testing environment
- Student government for requirements gathering

### Technical Stack
- **Django Software Foundation** - Django framework
- **Django REST Framework** - API toolkit
- **React Team** - Frontend framework
- **Vite Team** - Build tooling

### Open Source Libraries
- Bootstrap 5 - UI framework
- Axios - HTTP client
- Font Awesome - Icon library
- cryptography - Python encryption library

### Research References
- Blockchain voting system research papers
- Privacy-preserving voting protocols
- Modern web application security practices
- WCAG accessibility guidelines

---

## 💬 Support

### For Users
- **Registration Issues**: Contact system administrator
- **Voting Problems**: Check election status and eligibility
- **Account Questions**: Use password reset or contact admin

### For Administrators
- **System Setup**: Follow Quick Start guide in README.md
- **Configuration**: Check settings.py and .env
- **Troubleshooting**: Review Django logs and error messages

### For Developers
- **API Documentation**: See API Documentation section above
- **Code Issues**: Check Django system checks
- **Database Problems**: Review migration status

### Contact Information
- **System Administrator**: [Contact information]
- **Technical Support**: [Support email/channel]
- **Security Issues**: [Security contact - private channel]

---

## 📞 Quick Reference

### Essential URLs
- **Backend API**: `http://localhost:8000/api/`
- **Django Admin**: `http://localhost:8000/admin/`
- **Frontend**: `http://localhost:5173/`
- **API Health**: `http://localhost:8000/api/health/` (alias: `/api/common/health/`)

### Essential Commands
```powershell
# Start backend
cd backend
..\env\Scripts\Activate.ps1
python manage.py runserver

# Start frontend
cd frontend
npm run dev

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser
# OR
python manage.py superuser --username admin --email admin@example.com

# System check
python manage.py check
```

### Key Files
- `.env.example` (repository root) - Template; copy to `.env` beside it (Django reads root `.env`, then optional `backend/.env`)
- `backend/backend/settings.py` - Django configuration
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `frontend/.env` - Optional; `VITE_API_BASE_URL` for production builds

---

**E-Botar v2.1.0** | Last Updated: May 2026 | Performance Tested & Optimized  
**Status**: Production Ready | Full Stack Complete

**Built with ❤️ for democratic student governance**

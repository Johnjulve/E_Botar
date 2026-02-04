# E-Botar - System Information

**Version 0.7.8** | Complete system documentation and technical details

[![Django](https://img.shields.io/badge/Django-5.2.8-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.1-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)](#)

---

## 📖 Table of Contents

- [Release Highlights (0.7.8)](#-release-highlights-078)
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

## 🚀 Release Highlights (0.7.8)

- **College Terminology Alignment**: UI consistently uses "College" for department-type programs and academic info, while underlying program_type values remain `department`/`course`.
- **Program Type Badge**: Admin Programs list shows "College" badge for department-type rows; Courses remain unchanged.
- **Profile Edit Terminology**: Academic info labels and placeholders use "College," and the course selector prompts "Select College First."
- **Data Export Terminology**: Data export pages updated to use "College" terminology consistently throughout PDF exports, labels, and dropdowns.
- **API Guide**: Frontend route `/guide` and backend-served `/guide/` provide full API documentation; usable when only the backend is accessible. Footer link to API Guide.
- **Configurable Branding**: Public `GET /api/common/branding/` and frontend `BrandingContext`; institution name, logo, and app name configurable via System Settings for multi-school reuse (Navbar, Dashboard, Footer, Login, Register, Data Export). See backend `BRANDING.md`.
- **Middle Name Support**: UserProfile and registration/profile edit support middle name; display uses "first middle last" formatting via `getFullName()` helper. Run `python manage.py migrate accounts` for migration `0003_add_middle_name`.
- **Profile Image Fallback**: When profile or candidate photos fail to load, UI shows initials placeholders; backend cleans up old avatar files on save and provides `cleanup_unused_media` management command for orphaned images.
- **CSS Architecture & Documentation**: Foundation/global/vendors structure in place; `global.css` removed. README and `frontend/CSS_STRUCTURE_REVIEW.md` updated; see `frontend/CSS_ARCHITECTURE_STRATEGY.md` for rules and structure.
- **Election Creation & Management**: Robustness and safety improvements for election workflows.
  - **Spam-Click Prevention**: Creating an election disables the submit button immediately (frontend ref guard) and the backend rejects duplicate create requests from the same user within 10 seconds (429 Too Many Requests).
  - **Duplicate A.Y. Prevention**: You cannot create another election for the same academic year and category (USC or same department); validation runs on create and update with clear error messages.
  - **Delete on Edit**: When editing an election, superusers see a "Delete Election" button with confirmation; staff users do not (backend allows delete only for superusers).
- **Academic Year Selector (Home)**: Dashboard academic year dropdown options shortened to a manageable list: 2 years past and 5 years ahead (8 options total), so the list stays short while covering current and near-future academic years.

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
- **General-Purpose Algorithm Library**: Comprehensive suite of efficient, reusable algorithms
  - **Sorting Algorithms**: Quicksort (O(n log n) avg) and Merge Sort (O(n log n) guaranteed) for efficient data sorting
  - **Searching Algorithms**: Binary search (O(log n)) and linear search (O(n)) with flexible key functions
  - **Grouping & Aggregation**: Hash-based grouping (O(n)) and multi-level aggregation algorithms
  - **Cryptographic Algorithms**: Centralized SHA-256 and MD5 hashing for security operations
  - **Categorization & Organization**: Hierarchical categorization and organization algorithms
  - **Optimization Algorithms**: Batch processing and memoization for performance optimization
  - **Type-Agnostic Design**: Works with dictionaries, objects, lists, tuples, and any iterable data structures
  - **Fully Tested**: Comprehensive test suite verifies all algorithm implementations
  - **Production Integrated**: Algorithms integrated into voting, election, and data processing modules

### Algorithm Integration (0.7.6)
- **Voting Module**: Candidate sorting in election results uses `SortingAlgorithm.quicksort()`
- **Services**: Cache key generation uses `CryptographicAlgorithm.md5_hash()` in voting and election services
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

### Vision
To modernize student elections by providing a secure, accessible, and efficient digital voting platform that maintains the integrity of the democratic process while enhancing voter participation and transparency.

### Thesis Research
This system is developed as part of academic research on **"Blockchain-Inspired Electronic Voting Systems for Student Government Elections"**, focusing on:
- Privacy-preserving vote anonymization
- Cryptographic receipt verification
- Transparent audit trails without compromising voter privacy
- Modern web architecture for scalability and maintainability

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
- Individual verifiability through encrypted receipts
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

E-Botar implements a comprehensive suite of efficient algorithms for data processing, optimized for performance and reusability across all system features. All algorithms are general-purpose and type-agnostic, working with dictionaries, objects, lists, and any iterable data structures.

### Algorithm Categories

#### 1. **Sorting Algorithms**

**Quicksort** (`SortingAlgorithm.quicksort`)
- **Type**: Divide-and-conquer sorting algorithm
- **Time Complexity**: O(n log n) average case, O(n²) worst case
- **Space Complexity**: O(log n) average case
- **Use Case**: Sorting election results by vote count, candidates by name, students by ID
- **Why Chosen**: Efficient average-case performance, in-place sorting capability
- **Implementation**: Partition-based recursive algorithm with pivot selection

**Merge Sort** (`SortingAlgorithm.mergesort`)
- **Type**: Divide-and-conquer sorting algorithm
- **Time Complexity**: O(n log n) guaranteed (best, average, worst)
- **Space Complexity**: O(n)
- **Use Case**: Stable sorting when maintaining relative order matters (e.g., sorting by multiple criteria)
- **Why Chosen**: Guaranteed O(n log n) performance, stable sort (preserves order of equal elements)
- **Implementation**: Recursive merge of sorted sub-arrays

**Nested Dictionary Sorting** (`SortingAlgorithm.sort_nested_dict`)
- **Type**: Recursive sorting for hierarchical data structures
- **Time Complexity**: O(n log n) per level
- **Space Complexity**: O(n)
- **Use Case**: Sorting multi-level grouped data (department → course → year level)
- **Why Chosen**: Handles complex nested structures efficiently

#### 2. **Searching Algorithms**

**Binary Search** (`SearchingAlgorithm.binary_search`)
- **Type**: Divide-and-conquer search algorithm
- **Time Complexity**: O(log n)
- **Space Complexity**: O(1)
- **Prerequisites**: Requires sorted array
- **Use Case**: Finding students by ID, candidates by name in sorted lists
- **Why Chosen**: Extremely efficient for sorted data, logarithmic time complexity
- **Implementation**: Iterative/recursive search by repeatedly dividing search space in half

**Linear Search** (`SearchingAlgorithm.linear_search`)
- **Type**: Sequential search algorithm
- **Time Complexity**: O(n)
- **Space Complexity**: O(1)
- **Use Case**: Searching unsorted data, finding items by custom predicates
- **Why Chosen**: Works with unsorted data, supports custom search conditions
- **Implementation**: Iterate through items until match found

**Find All** (`SearchingAlgorithm.find_all`)
- **Type**: Filtering algorithm with predicate matching
- **Time Complexity**: O(n)
- **Space Complexity**: O(k) where k = number of matches
- **Use Case**: Finding all students matching criteria (e.g., age > 18, active status)
- **Why Chosen**: Efficient filtering with custom conditions

#### 3. **Grouping & Aggregation Algorithms**

**Hash-Based Grouping** (`DataGroupingAlgorithm.group_by`)
- **Type**: Hash map-based grouping algorithm
- **Time Complexity**: O(n)
- **Space Complexity**: O(n)
- **Use Case**: Grouping students by department, votes by category
- **Why Chosen**: Single-pass O(n) complexity, works with any data type
- **Implementation**: Uses Python's `defaultdict` for efficient key-value mapping

**Hierarchical Grouping** (`DataGroupingAlgorithm.group_by_hierarchy`)
- **Type**: Multi-level hash map grouping
- **Time Complexity**: O(n × m) where m = hierarchy levels
- **Space Complexity**: O(n)
- **Use Case**: Organizing data by department → course → year level
- **Why Chosen**: Efficiently handles nested grouping requirements
- **Implementation**: Nested dictionary structure with hash map lookups

**Multi-Key Grouping** (`DataGroupingAlgorithm.group_by_multiple`)
- **Type**: Simultaneous multi-key grouping
- **Time Complexity**: O(n × m) where m = number of keys
- **Space Complexity**: O(n)
- **Use Case**: Grouping by multiple attributes simultaneously
- **Why Chosen**: Flexible grouping by multiple criteria in single pass

**Aggregation** (`AggregationAlgorithm.aggregate`)
- **Type**: Single-pass aggregation with multiple operations
- **Time Complexity**: O(n)
- **Space Complexity**: O(k) where k = unique categories
- **Operations Supported**: count, sum, average, min, max, list, set
- **Use Case**: Counting votes by category, summing amounts by department
- **Why Chosen**: Efficient single-pass aggregation, supports multiple operations
- **Implementation**: Hash map accumulation with operation-specific logic

#### 4. **Categorization & Organization Algorithms**

**Hierarchical Categorization** (`CategorizationAlgorithm.categorize_by_hierarchy`)
- **Type**: Flexible hierarchical categorization with configurable extractors
- **Time Complexity**: O(n × m) where m = hierarchy levels
- **Space Complexity**: O(n)
- **Use Case**: Categorizing votes by demographics, organizing students by academic hierarchy
- **Why Chosen**: Highly flexible, works with any data structure
- **Implementation**: Configurable key extraction functions for maximum reusability

**Hierarchical Organization** (`OrganizationAlgorithm.organize_by_hierarchy`)
- **Type**: Multi-level data organization with metadata support
- **Time Complexity**: O(n × m) where m = hierarchy levels
- **Space Complexity**: O(n)
- **Use Case**: Organizing students by department/course/year with full item lists
- **Why Chosen**: Supports both count-only and full-item storage modes

#### 5. **Cryptographic Algorithms**

**SHA-256 Hashing** (`CryptographicAlgorithm.sha256_hash`)
- **Type**: Cryptographic hash function
- **Time Complexity**: O(n) where n = input length
- **Space Complexity**: O(1)
- **Use Case**: Vote receipt hashing, vote verification hashes
- **Why Chosen**: Industry-standard cryptographic hash, collision-resistant
- **Security**: One-way function, deterministic, avalanche effect
- **Output**: 64-character hexadecimal string (256 bits)

**MD5 Hashing** (`CryptographicAlgorithm.md5_hash`)
- **Type**: Cryptographic hash function (for non-security purposes)
- **Time Complexity**: O(n) where n = input length
- **Space Complexity**: O(1)
- **Use Case**: Cache key generation, non-critical hashing
- **Why Chosen**: Fast hash for non-security applications
- **Note**: Not used for security-sensitive operations (SHA-256 used instead)
- **Output**: 32-character hexadecimal string (128 bits)

#### 6. **Optimization Algorithms**

**Batch Processing** (`BatchProcessingAlgorithm.process_in_batches`)
- **Type**: Memory-efficient batch processing
- **Time Complexity**: O(n)
- **Space Complexity**: O(batch_size) instead of O(n)
- **Use Case**: Processing large datasets without memory overflow
- **Why Chosen**: Prevents memory issues with large datasets
- **Implementation**: Divides data into fixed-size batches for sequential processing

**Memoization** (`MemoizationAlgorithm.memoize_with_key`)
- **Type**: Dynamic programming optimization technique
- **Time Complexity**: O(1) for cached results, O(f(n)) for computation
- **Space Complexity**: O(k) where k = unique input combinations
- **Use Case**: Caching expensive computations (e.g., election statistics)
- **Why Chosen**: Dramatically improves performance for repeated computations
- **Implementation**: Decorator pattern with custom cache key generation

### Algorithm Selection Rationale

**Why These Algorithms?**
1. **Performance**: All algorithms chosen for optimal time/space complexity
2. **Generality**: Type-agnostic design allows reuse across all features
3. **Flexibility**: Custom key functions and comparators support diverse use cases
4. **Industry Standard**: Common algorithms (quicksort, binary search) are well-understood and proven
5. **Scalability**: Algorithms scale efficiently with data size

**Common vs. Specialized Algorithms**
- **Common Algorithms**: Quicksort, Merge Sort, Binary Search - standard CS algorithms, well-documented and commonly taught in computer science courses
- **Specialized Algorithms**: Hierarchical grouping, multi-level aggregation - optimized for E-Botar's specific data structures (department → course → year level hierarchies) but use standard algorithmic principles

### Data Structures Used

**Hash Maps (Dictionaries)**
- **Use**: Grouping, aggregation, categorization
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
- Batch Processing: O(n) with O(batch_size) memory

**Worst Case Scenarios**:
- Quicksort: O(n²) - rare, occurs with poor pivot selection
- Linear Search: O(n) - acceptable for unsorted data
- All other algorithms maintain their average-case complexity

**Space Efficiency**:
- Most algorithms: O(n) space complexity
- Batch Processing: O(batch_size) - memory-efficient for large datasets
- Memoization: O(k) where k = unique computations

### Real-World Applications in E-Botar

1. **Election Results Processing**: Quicksort for sorting candidates by vote count
2. **Student Data Organization**: Hierarchical grouping for department/course/year organization
3. **Vote Categorization**: Multi-level categorization by demographics
4. **Data Export**: Efficient aggregation and sorting for PDF/CSV exports
5. **Search Functionality**: Binary search for fast student/candidate lookups
6. **Cache Management**: MD5 hashing for cache key generation
7. **Security**: SHA-256 hashing for vote receipt verification

### Algorithm Complexity Summary

| Algorithm | Time Complexity | Space Complexity | Type |
|-----------|----------------|------------------|------|
| Quicksort | O(n log n) avg, O(n²) worst | O(log n) | Sorting |
| Merge Sort | O(n log n) | O(n) | Sorting |
| Binary Search | O(log n) | O(1) | Searching |
| Linear Search | O(n) | O(1) | Searching |
| Hash Grouping | O(n) | O(n) | Grouping |
| Hierarchical Grouping | O(n × m) | O(n) | Grouping |
| Aggregation | O(n) | O(k) | Aggregation |
| Batch Processing | O(n) | O(batch_size) | Optimization |
| SHA-256 Hash | O(n) | O(1) | Cryptographic |
| MD5 Hash | O(n) | O(1) | Cryptographic |

*Where: n = number of items, m = hierarchy levels, k = unique categories*

---

## ✨ Key Features

### 🗳️ **Privacy-Preserving Voting**
- **Immediate Anonymization**: Votes are instantly separated from voter identity upon submission
- **Encrypted Ballots**: Personal ballot copy stored encrypted for verification only
- **Anonymous Tallying**: Results computed from anonymized vote records
- **Cryptographic Receipts**: SHA-256 hashed receipt codes with encrypted originals
- **One-Vote-Per-Election**: Database-level unique constraints prevent duplicate voting
- **Vote Verification**: Voters can verify their ballot without revealing choices

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
│  │  React 18 + Vite                                    │   │
│  │  - User Interface Components                        │   │
│  │  - Admin Dashboard (In Development)                 │   │
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

**Frontend Environment Variables** (`.env`):
```bash
# Production only - Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

**Backend Environment Variables** (`.env`):
```bash
# Frontend URL for CORS (production)
FRONTEND_URL=http://localhost:5173

# Or multiple frontends (comma-separated)
FRONTEND_URL=http://localhost:5173,https://staging.example.com
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
├── title (auto-generated: "SY YYYY-YYYY")
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
├── receipt_code (SHA-256 hash)
├── encrypted_original_receipt (Fernet encrypted)
├── created_at, ip_address
└── [proves user voted, no vote choices]

Ballot
├── user → User (FK)
├── election → SchoolElection (FK)
├── encrypted_choices (JSON encrypted)
├── submitted_at, ip_address
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
2. Create Ballot (encrypted vote choices for verification)
3. Create AnonVotes (one per position, NO user reference)
    ↓
Results computed from AnonVotes ONLY
```

This design ensures:
- ✅ Voter privacy (no link between user and vote in tallying)
- ✅ Individual verifiability (users can check their encrypted ballot)
- ✅ Audit trail (receipts prove participation without revealing votes)
- ✅ Transparent counting (AnonVotes are countable by anyone with DB access)

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
- **Charts**: Chart.js (planned)

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
- **Media Files**: Local storage or S3-compatible
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

# Create .env file
# Copy .env.example to .env and configure:
# - SECRET_KEY (Django secret)
# - FERNET_KEY (for ballot encryption)
# - DATABASE settings (if using PostgreSQL)
# - CORS_ALLOWED_ORIGINS (frontend URL)

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

# Create .env file
# Set VITE_API_BASE_URL=http://localhost:8000

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

### API Modules

#### 1. Accounts Module (`/api/auth/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health/` | GET | Public | Health check |
| `/register/` | POST | Public | User registration |
| `/token/` | POST | Public | Obtain JWT token |
| `/token/refresh/` | POST | Public | Refresh JWT token |
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
| `/health/` | GET | Public | Health check |
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
| `/health/` | GET | Public | Health check |
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
| `/health/` | GET | Public | Health check |
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

## Defaults

If a key is missing, the API returns these defaults (current SNSU branding):

- `institution_name`: `SURIGAO DEL NORTE`
- `institution_name_line2`: `STATE UNIVERSITY`
- `institution_logo_url`: `null` (frontend uses bundled default logo)
- `app_name`: `E-Botar`

No database migration is required; defaults are applied in code.

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

**Encryption**:
- Ballot copies encrypted with Fernet (symmetric encryption)
- Receipt codes stored as SHA-256 hashes
- Original receipts encrypted for verification
- Passwords hashed with PBKDF2 (Django default)

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
- **[Information.md](Information.md)** - Complete system information (this file)
- **[Phase_Implementation.md](Phase_Implementation.md)** - Implementation roadmap and progress
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[ADMIN_DASHBOARD_SPEC.md](ADMIN_DASHBOARD_SPEC.md)** - React admin dashboard specification
- **[PHASE1_COMPLETION_SUMMARY.md](PHASE1_COMPLETION_SUMMARY.md)** - Phase 1 completion details
- **[PHASE2_DEFERRED_FEATURES.md](PHASE2_DEFERRED_FEATURES.md)** - Features for future implementation

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

### Current Version: 0.7.7
- ✅ Complete Backend API (50+ endpoints)
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
- ✅ General-Purpose Algorithm Library (sorting, searching, grouping, aggregation, cryptographic)
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

### Next: Version 0.8.0 (Q1 2025)
- 🔄 Enhanced data visualizations (Chart.js integration)
- 🔄 Advanced analytics dashboard
- 🔄 Additional performance optimizations
- 🔄 Extended testing suite (unit tests, integration tests)

### Future: Version 1.0.0 (Q2 2025)
- 📋 Email notification system (P1 deferred feature)
- 📋 Analytics & reporting dashboard (P2 deferred feature)
- 📋 Google OAuth integration (P2 deferred feature)
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
- 📋 Blockchain integration (proof-of-concept)

**Note**: See [PHASE2_DEFERRED_FEATURES.md](PHASE2_DEFERRED_FEATURES.md) for complete feature roadmap with priorities and implementation details.

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
- Chart.js - Data visualization
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
- **API Health**: `http://localhost:8000/api/auth/health/`

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
- `backend/backend/settings.py` - Django configuration
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `.env` - Environment variables (create from .env.example)

---

**E-Botar v0.7.8** | Last Updated: December 2025 | Performance Tested & Optimized  
**Status**: Production Ready | Full Stack Complete

**Built with ❤️ for democratic student governance**

# 🗳️ E-Botar
### Blockchain-Inspired Electronic Voting Platform for Academic Institutions

> A secure, privacy-preserving, and auditable electronic voting platform designed for university student councils and collegiate elections.

[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python&logoColor=white)](#)
[![Django](https://img.shields.io/badge/Django-5.2-092E20.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.16-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active_v4.0.0-success.svg)](#)

---

## 📖 Quick Links & Documentation

| Resource | Purpose |
|:---|:---|
| 🚀 **[Quick Start Guide](#-quick-start)** | Clone, configure environment, and spin up local dev servers |
| 🎯 **[System Overview & Architecture](#-overview)** | Blockchain ledger concept, privacy model, and research background |
| ✨ **[Key Features](#-key-features)** | Multi-institution branding, roster sync, privacy voting, exports |
| 👥 **[Role-Based Access Control](#-role-based-access-control)** | Student, Staff, and Administrator capabilities |
| 🔬 **[Technical Reference](Information.md)** | Complete database models, cryptographic specs, and API documentation |
| 📜 **[Full Changelog Archive](CHANGELOG.md)** | Complete chronological history of all versions and patch notes |

---

## 🚀 What's New in v4.0.0

E-Botar **v4.0.0** transforms the platform into a turnkey **multi-institution electronic voting platform** with dynamic real-time CSS theming, client institutional presets, client-side & server-side media compression, and navbar theme synchronization:

- 🎨 **Multi-Institution Branding & Custom System Theming (`/admin/branding`)**:
  - Superusers and administrators can customize university names, line-2 campus subtitles, acronyms, taglines, support contacts, and official websites.
  - **Dynamic Theme Engine**: Derives primary, hover, active, soft backgrounds, borders, and sidebar tokens directly on `document.documentElement` with zero page reloads.
  - **Institutional Presets**: Includes client preset **Surigao del Norte State University (SNSU)** (`#0b6e3b` / `#f4cc5c`), UP Diliman, Ateneo de Manila, De La Salle, and UST.
  - **Custom Preset Manager**: Save the active form configuration into new custom presets via `+ Save Current as Preset`, preserve them across browser sessions, and delete obsolete presets.
  - **One-Click Baseline Default Reset**: Easily restore clean baseline **E-Botar** defaults with the canonical system logo (`logo.png`).
- 🖼️ **High-Resolution Brand Assets & Circular Favicon**:
  - Auto-trimmed default **E-Botar Banner Logo** (`logo.png`) eliminates letterboxing transparent margins and scales crisply up to `175px x 66px`.
  - Dedicated circular **"E" + Checkmark** browser tab favicon (`favicon.png` & `favicon.ico`) with tight bounding box for maximum legibility.
  - Automatically suppresses redundant adjacent text labels when the default E-Botar logo is active, while preserving standard institutional titles for client universities.
  - Client-side (HTML5 canvas) and server-side (Pillow) auto-compression for custom uploads > 2MB.
- 🗃️ **Brand Asset Library & Deduplication System**:
  - **Visual Asset Gallery**: View all previously uploaded logos with thumbnail previews, file size badges, and active badges.
  - **Re-Select Without Re-Uploading**: Switch active logos with one click from the library without duplicate file uploads.
  - **SHA-256 Upload Deduplication Guard**: Prevents duplicate uploads of identical images by reactivating the existing asset.
  - **Safe Asset Deletion with Fallback**: Unused assets can be permanently deleted; deleting the active logo automatically reverts branding back to canonical `logo.png`.
- 🔔 **Modern Floating Toast Popup Notifications**:
  - Replaced inline alert banners with a fixed floating toast popup notification with auto-dismiss (3.5s) and slide-in animation.
- 🧭 **Dynamic Navbar & Sidebar Theme Adaptation**:
  - Header topbar (`.topbar`), desktop sidebar (`.desktop-sidebar`), and mobile offcanvas (`.offcanvas.offcanvas-end`) immediately adapt to the chosen institutional theme colors.
- 🧪 **Expanded Backend Test Suite**:
  - Dedicated test suite `test_branding.py` validating public access, superuser permissions, hex regex validation, image compression, deduplication, asset library listing, activation, deletion fallback, and canonical resets (**42/42 total backend tests passing**).

> 📜 **Looking for earlier release notes?** Check out the complete archive of past version updates (v0.7.0 – v3.4.0) in [CHANGELOG.md](CHANGELOG.md).

---



## 🎯 Overview

E-Botar is a comprehensive electronic voting system designed specifically for student government elections. Built on blockchain-inspired security principles and privacy-preserving technologies, it provides a transparent, verifiable, and user-friendly platform for democratic participation in educational institutions.

### Blockchain-Inspired Concept (Single-System)

E-Botar applies blockchain principles in a centralized architecture (Django + relational DB), not a decentralized public chain. The design objective is to preserve election integrity and auditability while keeping deployment practical for school operations.

- **Block-style data idea**: each vote event is represented with hash-friendly fields (timestamp, vote payload, voter fingerprint, hash links).
- **Integrity via hashing**: SHA-256 is used for receipt verification and vote-related fingerprints.
- **Chaining principle**: vote records can be organized with previous/current hash references to detect tampering.
- **Immutability objective**: vote records are treated as append-only in workflow and policy.
- **Privacy first**: voter identity is separated from vote tally records; only anonymized votes are used for result computation.
- **Auditability**: receipts and activity logs provide verifiable participation and operational traceability.

### How the Voting Concept Works

1. A voter submits a ballot during an active election.
2. The system validates eligibility, election state, and one-vote-per-election constraints.
3. A vote receipt is generated and hashed (SHA-256) for personal verification.
4. Individual choices are converted into anonymized vote records for tallying.
5. Results are computed from anonymized data, not direct voter-linked records.
6. Administrative and security logs provide audit evidence for governance review.

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
- **Admin Profile Flexibility**: Academic information optional for administrators and staff
  - Admins can leave Student ID, Year Level, Department, and Course blank
  - Students still require all academic information
  - Clear UI indicators for optional vs required fields
- **Auto-Generated Student IDs**: Format YYYY-XXXXX (year + random digits) - only for students
- **Program Management**: Admin interface for managing departments and courses with CSV import/export
- **Program Hierarchy**: Unified department/course structure with direct department linkage for courses
- **Party Management**: Admin interface for managing political parties with full CRUD operations
- **Position Management**: Admin interface for managing election positions with reordering functionality
- **Data Export Management**: Unified admin page for exporting election results and student data in PDF format
- **Profile Verification**: Admin-controlled verification system
- **Avatar Support**: Profile photo uploads with validation
- **Role Management**: Admins can change user roles through the user management interface

### 🏛️ **Flexible Election Management**
- **Election Types**: University Student Council (USC) and Department Elections
  - **USC Elections**: All students can vote and apply as candidates
  - **Department Elections**: Restricted to specific departments
  - Auto-generated titles based on election type and academic year
  - Academic Year (AY) format: "USC Election AY 2025-2026" or "[DEPT_CODE] Election AY 2025-2026"
- **Eligibility System**: Automatic checks for voting and candidate applications
  - Department-based eligibility enforcement
  - Clear error messages for ineligible users
  - Visual indicators on election pages
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
- **Multiple Export Formats**: PDF, CSV, and JSON result exports
- **PDF Export System**: Professional formatted PDF exports for election results and student data
  - Election results with categorized vote counts by department, course, and year level
  - Student statistics organized by department, course, and year level
  - Statistics-only display (summary counts, no individual student names)
  - Support for both real data and mock data testing
- **Vote Categorization**: Optional breakdown of vote counts by demographic categories
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
- **React Dashboard**: Modern admin interface
- **Real-Time Feedback**: Comprehensive error handling and user guidance
- **Accessible Design**: WCAG compliance considerations
- **Progressive Enhancement**: Works across all modern browsers

> 📖 **For detailed architecture, database schema, and technology stack**, see [Information.md](Information.md#architecture)

---

## 🚀 Quick Start

### Prerequisites
- **Python**: 3.10+ | **Node.js**: 18.x+ | **Git**: Version control

### Installation

**Backend**:
```powershell
cd backend
python -m venv ../env
..\env\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py superuser  # Create admin account
python manage.py runserver  # Runs on http://localhost:8000
```

**Frontend**:
```powershell
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

> 📖 **For detailed installation and configuration**, see [Information.md](Information.md#getting-started)

---

## 🚂 Railway Deployment

E-Botar is configured to work seamlessly on Railway while maintaining full local development support.

### Quick Deploy to Railway

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Set Root Directory**: In Railway service settings, set Root Directory to `backend`
3. **Add PostgreSQL**: In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
4. **Set Environment Variables**:
   - `SECRET_KEY`: Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
   - `DEBUG`: Set to `False` for production
   - `FRONTEND_URL`: Your frontend URL (if deployed separately)
   - **`CLOUDINARY_URL`** *(recommended)*: persistent media storage for avatars, candidate photos, party logos, and supporting documents — Railway's filesystem is ephemeral, so without this, uploads disappear on redeploy. Format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (or set `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` separately).
5. **Deploy**: Railway will automatically detect the `Procfile` in `backend/` folder and deploy

### Local Development After Cloning

1. **Run Setup Script**:
   ```powershell
   # Windows
   .\setup_local.bat
   
   # Linux/Mac
   chmod +x setup_local.sh
   ./setup_local.sh
   ```

2. **Or Manual Setup**:
   ```powershell
   # Create .env from .env.example (repository root, next to this README)
   # Optionally add backend/.env for overrides — set SECRET_KEY at minimum
   
   # Create and activate virtual environment
   python -m venv env
   .\env\Scripts\Activate.ps1
   
   # Install backend dependencies
   cd backend
   pip install -r requirements.txt
   
   # Setup database
   python manage.py migrate
   
   # Create admin account
   python manage.py superuser --username admin --email admin@example.com
   # Or use environment variables:
   # SUPERUSER_USERNAME=admin SUPERUSER_EMAIL=admin@example.com python manage.py superuser --no-input
   
   # Run backend server
   python manage.py runserver
   
   # In another terminal, run frontend
   cd frontend
   npm install
   npm run dev
   ```

### Create Admin Account on Railway

After deploying to Railway, create your admin account:

```bash
# Option 1: Interactive (recommended)
railway run python manage.py superuser --username admin --email admin@example.com

# Option 2: Using environment variables (set in Railway dashboard)
railway run python manage.py superuser --no-input

# Option 3: Auto-generate password
railway run python manage.py superuser --username admin --email admin@example.com --no-input
```

**Environment Variables (set in Railway):**
- `SUPERUSER_USERNAME` - Admin username (default: admin)
- `SUPERUSER_EMAIL` - Admin email (default: admin@example.com)
- `SUPERUSER_PASSWORD` - Admin password (auto-generated if not set)

### Environment Detection

The system automatically detects the environment:
- **Local**: Uses SQLite, DEBUG=True, relaxed security, CORS allows all
- **Railway**: Uses PostgreSQL (from DATABASE_URL), DEBUG=False, production security, CORS restricted

No code changes needed - it just works! 🎉

**👉 [See Complete Railway Deployment Guide](RAILWAY_DEPLOYMENT.md)**

---

## 🔐 Role-Based Access Control

E-Botar implements a **three-tier role system**:

### Student Role
- Vote in active elections
- Apply as candidate (one application per election)
- View own profile, applications, and vote receipts
- Verify own ballot using receipt code

### Staff Role
- All Student permissions, plus:
- Manage elections (create, edit, activate/deactivate)
- Review and approve/reject candidate applications
- View election results and statistics
- Manage candidates and parties
- View activity logs and security events

### Admin Role
- All Staff permissions, plus:
- User management (activate/deactivate users, reset passwords)
- Role management (assign Student/Staff/Admin roles)
- Full system configuration access
- Export election results
- **Maintenance → Feature availability**: temporarily disable **Public registration** and **Google sign-in** (greys out Login options), plus export navigation availability and staff preview behavior.
- Access Django admin panel

> 📖 **For detailed role permissions and API documentation**, see [Information.md](Information.md#security-features)

---

## 📡 API Documentation

**Base URL**: `http://localhost:8000/api` (development)

**Authentication**: JWT tokens via `/api/auth/token/`

> 📖 **For complete API documentation with all endpoints and examples**, see [Information.md](Information.md#api-documentation)

---

## 🔒 Security Features

- **JWT Authentication**: Access tokens (30 minutes), refresh tokens (1 day)
- **Automatic Session Timeout**: Auto-logout after 5 minutes of inactivity
- **Role-Based Access Control**: Student, Staff, and Admin roles with granular permissions
- **Encryption**: Fernet encryption for ballots, SHA-256 for receipts
- **Privacy-Preserving**: Immediate vote anonymization, no user-vote linkage in tallying
- **Audit Logging**: Complete activity and security event logging

> 📖 **For detailed security features, encryption, and audit mechanisms**, see [Information.md](Information.md#security-features)

---

## 🔢 Versioning Strategy

E-Botar follows **Semantic Versioning (SemVer)**:

- **MAJOR** (`X.0.0`): Breaking architectural or API changes
- **MINOR** (`0.X.0`): Backward-compatible feature additions
- **PATCH** (`0.0.X`): Backward-compatible fixes and maintenance

Release notes are maintained in [CHANGELOG.md](CHANGELOG.md).  
Detailed technical and conceptual documentation is maintained in [Information.md](Information.md).

---

## 📚 Documentation

### Available Documentation

- **[README.md](README.md)** - Quick start guide (this file)
- **[Document.md](Document.md)** - Setup, configuration, roles, and troubleshooting handbook
- **[Information.md](Information.md)** - Complete system information and technical details
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[frontend/CSS_ARCHITECTURE_STRATEGY.md](frontend/CSS_ARCHITECTURE_STRATEGY.md)** - Frontend CSS architecture (foundation, global, module layers) and naming rules
- **[frontend/CSS_STRUCTURE_REVIEW.md](frontend/CSS_STRUCTURE_REVIEW.md)** - CSS structure review and migration status

### Quick Reference

**For Developers**:
1. Use [Document.md](Document.md) for local setup and operational workflow
2. Start with [Information.md](Information.md) for complete system documentation
3. Check [CHANGELOG.md](CHANGELOG.md) for recent changes
4. Reference [Phase_Implementation.md](Phase_Implementation.md) for architecture
5. For frontend CSS (variables, module prefixes, loading order), see [frontend/CSS_ARCHITECTURE_STRATEGY.md](frontend/CSS_ARCHITECTURE_STRATEGY.md)

**For Administrators**:
1. Start with [Document.md](Document.md) for installation and daily operations
2. Follow Quick Start guide above
3. See [Information.md](Information.md#user-workflows) for detailed workflows
4. Use [Information.md](Information.md#getting-started) for deeper configuration

**For Researchers**:
1. See [Information.md](Information.md#research-foundation) for academic basis
2. Review [Information.md](Information.md#architecture) for system design
3. Check [Information.md](Information.md#security-features) for security implementation

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
python manage.py superuser --username admin --email admin@example.com

# System check
python manage.py check

# Reset throttling (for testing)
python manage.py reset_throttling
python manage.py reset_throttling --username test_user

# Run backend unit & API test suite (33 passing tests)
python manage.py test tests
```

---

## 🧪 Testing Architecture

E-Botar employs a structured two-tier testing methodology to guarantee software reliability and academic verifiability:

- **Tier 1 (Unit & API Tests)**: Located in [`backend/tests/`](backend/tests/), providing fast automated regression testing for models, serializers, business rules, and API endpoints (`python manage.py test tests`).
- **Tier 2 (System, Performance, Security & UAT)**: Located in the root [`Testing/`](Testing/) directory, structuring higher-level quality verification:
  - **[System Testing](Testing/System/)**: End-to-end integration and voter journeys.
  - **[Performance Testing](Testing/Performance/)**: Concurrency benchmarks, load generation, and latency metrics.
  - **[Security Audit](Testing/Security/)**: Cryptographic ledger validation, tampering tests, and vulnerability scanning.
  - **[User Acceptance Testing](Testing/UAT/)**: Participant evaluation rubrics, usability surveys, and academic sign-offs.

---


### Key Files
- `Document.md` (repository root) - Setup-and-use handbook
- `.env.example` (repository root) - Template for `.env` (Django + documented Vite vars); copy to `.env` beside it
- `backend/backend/settings.py` - Django configuration (loads root `.env` then `backend/.env`)
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `frontend/.env` - Optional; set `VITE_API_BASE_URL` for production builds (Vite reads env from `frontend/` by default)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

**E-Botar v3.4.0** | Performance Tested & Optimized  
**Status**: Production Ready | Full Stack Complete



> 📖 **Handbook**: [Document.md](Document.md) · **Technical reference**: [Information.md](Information.md)

**Built with ❤️ for democratic student governance**


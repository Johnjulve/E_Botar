# E-Botar - Blockchain-Inspired Electronic Voting System

**Version 0.5.3** | A secure, privacy-preserving electronic voting platform for student government elections

[![Django](https://img.shields.io/badge/Django-5.2.8-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.1-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)](#)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Research Foundation](#research-foundation)
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
- **Student Profiles**: Complete academic information (department, course, year level)
- **Auto-Generated Student IDs**: Format YYYY-XXXXX (year + random digits)
- **Department & Course Hierarchy**: Organized academic structure management
- **Profile Verification**: Admin-controlled verification system
- **Avatar Support**: Profile photo uploads with validation

### 🏛️ **Flexible Election Management**
- **Multi-Election Support**: Manage concurrent and sequential elections
- **Precise Scheduling**: Start/end date-time with timezone support
- **Position Management**: Flexible position creation with custom ordering
- **Automatic State Transitions**: Time-based election status (upcoming, active, finished)
- **Party System**: Support for registered parties with branding
- **Election Analytics**: Real-time statistics and voter turnout

### 🎯 **Smart Candidate Applications**
- **Application Workflow**: Complete submission, review, and approval process
- **Business Rules Enforcement**: No consecutive terms for same position
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
- **Role-Based Access Control**: Public, authenticated, admin permission levels
- **Security Event Logging**: Automatic capture of security incidents
- **Activity Audit Trails**: Complete logging of user actions
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
│   │   │   ├── models.py       # User, UserProfile, Department, Course
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
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

### Database Schema

#### Core Models (18 Custom Models)

**User Management** (3 models)
```
User (Django built-in)
├── UserProfile (1:1)
│   ├── student_id (unique, auto-generated)
│   ├── department → Department (FK)
│   ├── course → Course (FK)
│   ├── year_level, phone_number, avatar
│   └── is_verified (admission gate)
│
Department
└── courses → Course (1:Many)
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
├── name, position_type
├── display_order
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

**Security & Audit** (3 models)
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
├── action, module, details (JSON)
├── ip_address, user_agent
└── timestamp

AccessAttempt
├── user → User (FK, optional)
├── username_attempt
├── success (boolean)
├── ip_address, user_agent
└── timestamp
```

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
- **Framework**: React 18.3 with Hooks
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

1. **Create Department & Courses** (via Django Admin):
   - Access: `http://localhost:8000/admin/`
   - Navigate to Accounts → Departments
   - Create departments (e.g., "Computer Science")
   - Add courses under each department

2. **Create Parties** (optional):
   - Navigate to Elections → Parties
   - Create political parties with names, colors, logos

3. **Create Positions**:
   - Navigate to Elections → School Positions
   - Create positions (President, Vice President, etc.)

4. **Create Election**:
   - Navigate to Elections → School Elections
   - Set start year and end year (auto-generates title)
   - Set start_date and end_date for voting period
   - Add positions to the election

5. **Ready to Use**:
   - Students can register via API
   - Admins can verify students
   - Candidates can apply (when election is upcoming)
   - Voting begins when election is active

---

## 📡 API Documentation

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
| `/departments/` | POST | Admin | Create department |
| `/courses/` | GET | Public | List courses |
| `/courses/` | POST | Admin | Create course |
| `/profiles/` | GET | Authenticated | List user profiles |
| `/profiles/{id}/` | GET | Authenticated | Get user profile |
| `/profiles/{id}/` | PATCH | Authenticated | Update profile |

#### 2. Elections Module (`/api/elections/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health/` | GET | Public | Health check |
| `/parties/` | GET | Public | List parties |
| `/parties/` | POST | Admin | Create party |
| `/positions/` | GET | Public | List positions |
| `/positions/` | POST | Admin | Create position |
| `/elections/` | GET | Public | List elections |
| `/elections/` | POST | Admin | Create election |
| `/elections/{id}/` | GET | Public | Get election details |
| `/elections/active/` | GET | Public | Get active elections |
| `/elections/upcoming/` | GET | Public | Get upcoming elections |
| `/elections/finished/` | GET | Public | Get finished elections |
| `/elections/{id}/add_position/` | POST | Admin | Add position to election |
| `/elections/{id}/remove_position/` | POST | Admin | Remove position from election |

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
| `/applications/pending/` | GET | Admin | Get pending applications |
| `/applications/{id}/review/` | POST | Admin | Review application |
| `/applications/bulk_review/` | POST | Admin | Bulk review applications |
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
| `/results/export_results/` | GET | Admin | Export results (CSV/JSON) |
| `/results/statistics/` | GET | Public* | Get election statistics |

*Public after election ends, Admin anytime

### Example API Calls

**Register User**:
```javascript
POST /api/auth/register/
{
  "username": "student123",
  "email": "student@example.com",
  "password": "SecurePass123!",
  "password2": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "department": 1,
  "course": 3,
  "year_level": "3rd Year"
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
- Access tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Tokens include user ID and expiration
- Token rotation on refresh

**Role-Based Access Control (RBAC)**:
- **Public**: Read-only access to elections, candidates, results (after election)
- **Authenticated**: Submit ballots, apply as candidate, view own data
- **Admin/Staff**: Full CRUD operations, review applications, manage elections

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

### Admin Workflow

```
1. Login as Admin
   └─> POST /api/auth/token/
       └─ Use: Staff/superuser credentials

2. Setup Academic Structure
   └─> POST /api/auth/departments/
       └─> POST /api/auth/courses/
           └─ Create departments and courses

3. Create Election
   └─> POST /api/elections/elections/
       ├─ Set: start_year, end_year, dates
       └─> POST /api/elections/elections/{id}/add_position/
           └─ Add positions to election

4. Review Candidate Applications
   └─> GET /api/candidates/applications/pending/
       └─> POST /api/candidates/applications/{id}/review/
           ├─ Action: approve or reject
           └─ Automatic: Candidate record created on approval

5. Monitor Voting
   └─> GET /api/voting/receipts/
       └─ View: Vote receipts and timestamps

6. View Results & Statistics
   └─> GET /api/voting/results/statistics/?election_id={id}
       └─ See: Turnout, participation metrics

7. Export Results
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

- **[README.md](README.md)** - This comprehensive overview
- **[Phase_Implementation.md](Phase_Implementation.md)** - Implementation roadmap and progress
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[ADMIN_DASHBOARD_SPEC.md](ADMIN_DASHBOARD_SPEC.md)** - React admin dashboard specification
- **[PHASE1_COMPLETION_SUMMARY.md](PHASE1_COMPLETION_SUMMARY.md)** - Phase 1 completion details
- **[PHASE2_DEFERRED_FEATURES.md](PHASE2_DEFERRED_FEATURES.md)** - Features for future implementation

### Quick Reference

**For Developers**:
1. Start with [Phase_Implementation.md](Phase_Implementation.md) for architecture overview
2. Reference this README for API documentation
3. Check [CHANGELOG.md](CHANGELOG.md) for recent changes

**For Administrators**:
1. Review this README for system overview
2. Follow Quick Start guide for installation
3. Use Admin Workflow section for daily operations

**For Researchers**:
1. Research Foundation section explains academic basis
2. Privacy-Preserving Design details voting architecture
3. Security Features section covers cryptographic implementations

---

## 🗺️ Roadmap

### Current Version: 0.2.0 (Phase 1 Complete)
- ✅ Complete Backend API (50+ endpoints)
- ✅ User authentication and profiles
- ✅ Election management
- ✅ Candidate applications
- ✅ Privacy-preserving voting
- ✅ Results and analytics
- ✅ Security logging

### Next: Version 0.3.0 (Phase 3 - Q1 2025)
- 🔄 React User Interface (authentication, voting, results)
- 🔄 React Admin Dashboard (election management, application review)
- 🔄 Data visualizations (Chart.js integration)
- 🔄 Mobile-responsive UI with Bootstrap 5
- 🔄 Complete frontend-backend integration

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
- **System Setup**: Follow Quick Start guide
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

# System check
python manage.py check
```

### Key Files
- `backend/backend/settings.py` - Django configuration
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `.env` - Environment variables (create from .env.example)

---

**E-Botar v0.2.0** | Last Updated: November 10, 2025  
**Status**: Backend Complete (Phase 1) | **Next**: React Dashboard (Phase 2)

**Built with ❤️ for democratic student governance**

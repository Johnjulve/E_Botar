# E-Botar - Blockchain-Inspired Electronic Voting System

**Version 0.6.3** | A secure, privacy-preserving electronic voting platform for student government elections

[![Django](https://img.shields.io/badge/Django-5.2.8-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.1-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)](#)

---

## 📖 Table of Contents

- [Release Highlights (0.6.3)](#-release-highlights-063)
- [Quick Start](#quick-start)
- [Key Features](#key-features)
- [Role-Based Access Control](#role-based-access-control)
- [Documentation](#documentation)
- [Quick Reference](#quick-reference)

> 📚 **For complete system information**, see [Information.md](Information.md)

---

## 🚀 Release Highlights (0.6.3)

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

> 📖 **For detailed overview, research foundation, and architecture**, see [Information.md](Information.md#overview)

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
- Access Django admin panel

> 📖 **For detailed role permissions and API documentation**, see [Information.md](Information.md#security-features)

---

## 📡 API Documentation

**Base URL**: `http://localhost:8000/api` (development)

**Authentication**: JWT tokens via `/api/auth/token/`

> 📖 **For complete API documentation with all endpoints and examples**, see [Information.md](Information.md#api-documentation)

---

## 🔒 Security Features

- **JWT Authentication**: Access tokens (1 hour), refresh tokens (7 days)
- **Role-Based Access Control**: Student, Staff, and Admin roles with granular permissions
- **Encryption**: Fernet encryption for ballots, SHA-256 for receipts
- **Privacy-Preserving**: Immediate vote anonymization, no user-vote linkage in tallying
- **Audit Logging**: Complete activity and security event logging

> 📖 **For detailed security features, encryption, and audit mechanisms**, see [Information.md](Information.md#security-features)

---

## 📚 Documentation

### Available Documentation

- **[README.md](README.md)** - Quick start guide (this file)
- **[Information.md](Information.md)** - Complete system information and technical details
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[Phase_Implementation.md](Phase_Implementation.md)** - Implementation roadmap and progress
- **[ADMIN_DASHBOARD_SPEC.md](ADMIN_DASHBOARD_SPEC.md)** - React admin dashboard specification
- **[PHASE1_COMPLETION_SUMMARY.md](PHASE1_COMPLETION_SUMMARY.md)** - Phase 1 completion details
- **[PHASE2_DEFERRED_FEATURES.md](PHASE2_DEFERRED_FEATURES.md)** - Features for future implementation

### Quick Reference

**For Developers**:
1. Start with [Information.md](Information.md) for complete system documentation
2. Check [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Reference [Phase_Implementation.md](Phase_Implementation.md) for architecture

**For Administrators**:
1. Follow Quick Start guide above
2. See [Information.md](Information.md#user-workflows) for detailed workflows
3. Use [Information.md](Information.md#getting-started) for configuration

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

**E-Botar v0.6.3** | Last Updated: November 25, 2025  
**Status**: Backend Complete | Frontend in Development

> 📖 **For complete documentation**, see [Information.md](Information.md)

**Built with ❤️ for democratic student governance**

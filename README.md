# E-Botar - Blockchain-Inspired Electronic Voting System

**Version 0.7.1** | A secure, privacy-preserving electronic voting platform for student government elections

[![Django](https://img.shields.io/badge/Django-5.2.8-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.1-red.svg)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)](#)

---

## 📖 Table of Contents

- [Release Highlights (0.7.1)](#-release-highlights-071)
- [Quick Start](#quick-start)
- [Key Features](#key-features)
- [Role-Based Access Control](#role-based-access-control)
- [Documentation](#documentation)
- [Quick Reference](#quick-reference)

> 📚 **For complete system information**, see [Information.md](Information.md)

---

## 🚀 Release Highlights (0.7.1)

- **Production API Fixes**: Fixed `/me` endpoint access issues in production with enhanced error handling, automatic token refresh, and improved CORS configuration.
- **Backend Error Resolution**: Resolved 500 Internal Server Error on `/me` endpoint by fixing serializer handling of None values and adding comprehensive error handling.
- **Automatic Token Refresh**: API service now automatically refreshes expired JWT tokens, providing seamless user experience without manual re-authentication.
- **Enhanced CORS Support**: Backend now properly supports multiple frontend URLs and improved production deployment configuration.

### Previous Highlights (0.7.0)
- **Production Deployment**: Added Vercel deployment configuration and production-ready build settings for frontend and backend.

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
   # Create backend/.env file (copy from backend/.env.example)
   # Edit backend/.env and set SECRET_KEY
   
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

**E-Botar v0.7.1** | Last Updated: December 2025  
**Status**: Production Ready | Full Stack Complete

> 📖 **For complete documentation**, see [Information.md](Information.md)

**Built with ❤️ for democratic student governance**

# RentTrack Documentation

Welcome to the RentTrack documentation directory. This folder contains all technical documentation, guides, and release notes for the RentTrack property management system.

---

## 📚 Documentation Index

### Getting Started

- **[QUICK_START.md](./QUICK_START.md)** - Get up and running quickly
  - Installation instructions
  - Basic configuration
  - First-time setup

### System Administration

- **[SUPER_ADMIN_SETUP.md](./SUPER_ADMIN_SETUP.md)** - Super admin guide
  - Creating the first super admin
  - Platform configuration
  - Organization management

- **[ADMIN_HIERARCHY_GUIDE.md](./ADMIN_HIERARCHY_GUIDE.md)** - Admin roles explained
  - System Admin vs SaaS Admin
  - Permission levels
  - Admin organization mode

### Features & Systems

- **[FEATURES.md](./FEATURES.md)** - Complete feature list
  - All available features
  - Feature descriptions
  - Access requirements

- **[TENANT_SYSTEMS_COMPLETE.md](./TENANT_SYSTEMS_COMPLETE.md)** - Tenant application system
  - Application workflow
  - Document uploads
  - Approval process
  - Portal signup

### Configuration Guides

- **[SMTP_AND_FILE_STORAGE_SETUP.md](./SMTP_AND_FILE_STORAGE_SETUP.md)** - Email & storage setup
  - SMTP configuration (Gmail, cPanel, AWS SES)
  - File storage setup
  - AWS S3 migration guide

### Release Information

- **[VERSION_HISTORY.md](./VERSION_HISTORY.md)** - Complete version history
  - All releases with detailed changelogs
  - Breaking changes
  - Upgrade instructions
  - Semantic versioning guide

- **[FIXES_APPLIED_20251130.md](./FIXES_APPLIED_20251130.md)** - Recent fixes (v2.1.0)
  - RLS recursion fix
  - Payment system separation
  - Technical details

---

## 🎯 Quick Links by Task

### I want to...

**Set up the system for the first time**
→ Start with [QUICK_START.md](./QUICK_START.md)

**Become a super admin**
→ Read [SUPER_ADMIN_SETUP.md](./SUPER_ADMIN_SETUP.md)

**Understand the admin roles**
→ Check [ADMIN_HIERARCHY_GUIDE.md](./ADMIN_HIERARCHY_GUIDE.md)

**Set up email notifications**
→ Follow [SMTP_AND_FILE_STORAGE_SETUP.md](./SMTP_AND_FILE_STORAGE_SETUP.md)

**See what features are available**
→ Browse [FEATURES.md](./FEATURES.md)

**Set up tenant applications**
→ Read [TENANT_SYSTEMS_COMPLETE.md](./TENANT_SYSTEMS_COMPLETE.md)

**Check what's new in this version**
→ See [VERSION_HISTORY.md](./VERSION_HISTORY.md)

**Understand recent bug fixes**
→ Review [FIXES_APPLIED_20251130.md](./FIXES_APPLIED_20251130.md)

---

## 📦 Current Version

**v2.1.0-beta** (2025-11-30)

Major release featuring:
- ✅ Complete tenant application workflow
- ✅ Separated payment systems (rent vs subscriptions)
- ✅ RLS infinite recursion fix
- ✅ Email notification system
- ✅ File upload system
- ✅ QR code generation

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for complete changelog.

---

## 🏗️ System Architecture

### Payment Systems

RentTrack uses **two separate payment systems**:

1. **Rent Payments** (`rent_payments` table)
   - Organizations collect rent from tenants
   - Each organization uses their own payment provider
   - Organizations keep 100% of collected rent

2. **Subscription Payments** (`subscription_payments` table)
   - Super admin collects platform subscription fees
   - Based on package tiers (Basic, Professional, Enterprise)
   - Monthly or annual billing

### Database

- **21 migrations** applied
- **Full RLS security** on all tables
- **Multi-tenant architecture** with organization isolation
- **Supabase PostgreSQL** backend

### Frontend

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Vite** for building

---

## 🔒 Security

- Row Level Security (RLS) on all database tables
- SECURITY DEFINER functions to prevent recursion
- Encrypted payment provider credentials
- Secure authentication via Supabase Auth
- Organization-level data isolation

---

## 🚀 Development

### Running the App

```bash
# Development
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck
```

### Environment Variables

Required variables (in `.env`):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

Optional (for email):
- `VITE_SMTP_HOST` - SMTP server host
- `VITE_SMTP_PORT` - SMTP server port
- `VITE_SMTP_USER` - SMTP username
- `VITE_SMTP_PASS` - SMTP password
- `VITE_SMTP_FROM` - From email address

See [SMTP_AND_FILE_STORAGE_SETUP.md](./SMTP_AND_FILE_STORAGE_SETUP.md) for detailed email setup.

---

## 📞 Support

For issues, questions, or contributions:

1. Check the relevant documentation file above
2. Review [VERSION_HISTORY.md](./VERSION_HISTORY.md) for known issues
3. Check [FIXES_APPLIED_20251130.md](./FIXES_APPLIED_20251130.md) for recent fixes

---

## 📝 Documentation Maintenance

### Adding New Documentation

1. Create markdown file in this directory
2. Add link to this README.md
3. Update VERSION_HISTORY.md if it's a release document

### Removing Outdated Documentation

1. Remove the file
2. Remove link from this README.md
3. Note removal in VERSION_HISTORY.md

---

**Last Updated:** 2025-11-30
**Current Version:** v2.1.0-beta
**Documentation Status:** Up to date ✅

# RentTrack Version History

**Current Version: v2.8.3-beta**

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** format
- **MAJOR** - Breaking changes, major rewrites (x.0.0)
- **MINOR** - New features, backwards compatible (1.x.0)
- **PATCH** - Bug fixes, small improvements (1.0.x)

---

## v2.8.3-beta (2025-12-02)

### 🤖 AI Recommendations System Overhaul

**Intelligent LLM Selection Engine**
- Advanced scoring algorithm considering cost, quality, and feature requirements
- Context window evaluation (128K+ premium, 100K+ high quality, 32K+ balanced)
- Cost efficiency scoring (better value for budget-conscious features)
- Capability matching (function calling, vision support)
- Quality tier classification: Premium, Balanced, Budget

**Smart Reasoning & Explanations**
- Each recommendation includes clear AI-generated reasoning
- Examples: "Best overall: Large context window with excellent pricing"
- "Best value: Extremely cost-effective for high-volume tasks"
- Feature-specific recommendations (e.g., vision capabilities highlighted when needed)

**Interactive Recommendation UI**
- Modal overlay system for clean, focused experience
- Clickable recommendation cards with hover effects
- One-click application of LLM selection
- Quality tier badges (yellow/blue/green color coding)
- Real-time status indicators ("You have this" for configured keys)
- Score-based ranking with varied, intelligent scoring

**Usage Analytics Modal**
- Feature-specific usage breakdown by date, provider, model
- Token consumption and cost tracking
- 30-day aggregated totals
- Clean table layout in overlay modal

### 🎨 UX Improvements

**Modal-Based Design Pattern**
- Replaced inline panels with elegant modal overlays
- Dark backdrop for focus
- Responsive design (mobile-friendly)
- Smooth animations and transitions
- Easy close functionality

---

## v2.2.0-beta (2025-11-30)

### 🆕 Major Feature: Pay-As-You-Go Add-On System

**Monetization Strategy Enhancement**
- Flexible capacity expansion without full plan upgrades
- Individual add-ons for properties, units, tenants, team members, and businesses
- Recurring monthly billing per add-on
- Natural upsell path: Free → Add-ons → Paid Plans

**Database Tables (Migration 023)**
- `addon_products` - Available add-ons with pricing
  - Property ($10/mo), Unit ($3/mo), Tenant ($2/mo), Team Member ($8/mo), Business ($15/mo)
- `organization_addon_purchases` - Purchase tracking per organization
  - Quantity support, status tracking, billing dates
- `organization_usage_tracking` - Real-time resource usage
  - Auto-updated via triggers on all resource tables

**Smart Limit Enforcement**
- `get_organization_limits()` - Calculates base + add-on capacity
- `check_organization_limit()` - Validates before resource creation
- Automatic usage tracking via database triggers
- Blocks creation when limits reached

**Add-On Marketplace Page (`/addons`)**
- Real-time usage dashboard with progress bars
- Visual indicators for resources at/near limits
- One-click add-on purchasing
- Active add-on management with cancellation
- Monthly recurring billing display

**Upgrade Prompt System**
- Elegant modal when limits are reached
- Two upgrade paths presented:
  1. Purchase specific add-ons (flexible)
  2. Upgrade to higher tier (better value)
- Context-aware (shows which resource is limited)
- Direct navigation to solutions

**Services Integration**
- `addonService.ts` - Complete add-on management
- Limit checking in all creation services:
  - `businessService.ts` - Business creation checks
  - `propertyService.ts` - Property creation checks
  - `unitService.ts` - Unit creation checks
  - `tenantService.ts` - Tenant creation checks
- Usage tracking automatically updates on create/delete

**Pricing Page Enhancements**
- Free tier highlighted with green "No Credit Card Required" badge
- Dynamic annual savings calculation (not hardcoded 20%)
- Shows actual percentage saved based on package prices
- New add-on showcase section with pricing
- Updated messaging: credit card required for paid plans
- Clear differentiation between free and paid trials

**UI/UX Improvements**
- Add-Ons navigation item in sidebar
- Usage progress bars with color coding:
  - Green: < 80% capacity
  - Yellow: 80-99% capacity
  - Red: At limit
- Professional upgrade prompt design
- Active add-on display with billing dates

**Business Benefits**
- **Lower signup friction**: Free tier with no card
- **Flexible growth**: Pay only for what you need
- **Natural upsell**: Add-ons drive tier upgrades
- **Revenue diversification**: Multiple touchpoints
- **Customer retention**: Incremental investment creates stickiness

**Technical Implementation**
- RLS policies for secure add-on access
- SECURITY DEFINER functions to prevent recursion
- Automatic usage synchronization via triggers
- Error handling with user-friendly prompts
- TypeScript interfaces for type safety

**Total Code Added**
- 1 database migration (023)
- 1 new service file
- 1 new page component
- 1 new shared component (UpgradePrompt)
- 4 services updated with limit checks
- ~2,000 lines of new code

---

## v2.1.0-beta (2025-11-30)

### 🎉 Major Release: Complete Tenant Application & Payment Architecture

This is a **MAJOR ARCHITECTURAL RELEASE** with complete tenant application workflow, separated payment systems, and critical RLS fixes.

---

#### ✨ Tenant Application System (Complete End-to-End)

**Public Application Landing Pages**
- Unique application codes per property/unit
- Beautiful public-facing application landing pages
- QR code generation for each listing
- Mobile-responsive design
- No login required for applicants

**Multi-Step Application Form**
- Personal information collection
- Employment and income verification
- Rental history with references
- Emergency contact information
- Document uploads (4 types):
  - Government-issued ID
  - Proof of income
  - References
  - Additional documents

**AI-Powered Application Scoring**
- Automated scoring algorithm (0-100)
- Income-to-rent ratio analysis
- Employment stability assessment
- Rental history evaluation
- Weighted scoring system
- Risk level categorization

**Landlord Application Dashboard**
- View all applications per property
- Compare multiple applicants side-by-side
- View uploaded documents
- Application status tracking (pending, approved, rejected)
- One-click approval → convert to tenant

**Seamless Tenant Conversion**
- One-click "Approve & Create Tenant" button
- Automatically creates tenant record
- Transfers all application data
- Generates tenant portal invitation
- Sends welcome email with signup code
- Zero data re-entry required

**Tenant Portal Signup**
- Public signup page with invitation code
- Code validation against database
- Automatic tenant account creation
- Secure authentication setup
- Immediate portal access

**Database Tables**
- `rental_applications` - Application submissions
- `rental_listings` - Property/unit listings with codes
- `tenant_invitations` - Secure invitation codes
- Full RLS policies for security
- Migration 018: Tenant invitation system
- Migration 019: Rental application system

**Frontend Pages (5 New)**
- `/apply/:code` - Application landing page
- `/apply/:code/form` - Application form
- `/applications` - Landlord dashboard
- `/tenant-portal` - Tenant landing page
- `/tenant-signup` - Signup with code

**Services**
- `rentalApplicationService.ts` - Application management
- `tenantInvitationService.ts` - Invitation handling
- `fileStorageService.ts` - Document uploads

**Email System**
- SMTP integration (Gmail, cPanel, AWS SES)
- Console fallback for testing
- 3 email templates:
  - Application submitted
  - Application approved
  - Application rejected
- Beautiful HTML email templates

---

#### 💳 Payment System Architecture Overhaul

**BREAKING CHANGE: Separated Payment Systems**

Previously, all payments were in a single `payments` table, causing confusion between:
1. Tenant rent payments (org collects from tenants)
2. Platform subscription payments (super admin collects from orgs)

**New Architecture:**

**Rent Payments System** (`rent_payments` table)
- Organizations collect rent from their tenants
- Each organization uses THEIR OWN payment provider:
  - Stripe (org's account)
  - PayPal (org's account)
  - Square (org's account)
  - Manual/check collection
- Organizations keep 100% of rent
- Payment provider config stored in `organizations` table
- New columns:
  - `payment_provider_type` (text)
  - `payment_provider_config` (jsonb, encrypted)
  - `payment_provider_enabled` (boolean)

**Subscription Payments System** (`subscription_payments` table)
- Super admin collects subscription fees from organizations
- Platform uses super admin's payment provider
- Monthly/annual billing cycles
- Tied to package tiers
- Columns:
  - `organization_id` (references organizations)
  - `package_tier_id` (references package_tiers)
  - `amount_cents` (integer)
  - `billing_period_start/end` (dates)
  - `status` (pending, paid, failed, refunded, cancelled)
  - `due_date`, `paid_at` (timestamps)

**Migration 021: Separate Payment Systems**
- Renamed `payments` → `rent_payments`
- Created `subscription_payments` table
- Added payment provider config to organizations
- Updated all RLS policies
- Separated payment flows completely

**Updated Services (5 files)**
- `paymentService.ts` → uses `rent_payments`
- `financialService.ts` → uses `rent_payments`
- `tenantService.ts` → uses `rent_payments`
- `portfolioHealthService.ts` → uses `rent_payments`
- `paymentPredictionService.ts` → uses `rent_payments`

---

#### 🐛 Critical Bug Fix: RLS Infinite Recursion

**Problem**
- Organization members couldn't access dashboard, properties, tenants, or any menu items
- Error: "infinite recursion detected in policy for relation organization_members"
- 500 errors on all queries

**Root Cause**
- RLS policies on `organizations` queried `organization_members`
- RLS policies on `organization_members` queried `organizations`
- Circular dependency caused infinite recursion

**Solution (Migration 020)**
- Created `check_organization_membership()` SECURITY DEFINER function
- Function bypasses RLS when checking membership
- Breaks recursion cycle using elevated privileges
- Added member access policies to all related tables:
  - organizations
  - organization_members
  - properties
  - tenants
  - units
  - leases
  - rent_payments

**Result**
- ✅ Dashboard loads without errors
- ✅ Properties, tenants, units all accessible
- ✅ Organization members have proper access
- ✅ Super admins maintain full access
- ✅ No more recursion errors

---

#### 🗃️ Database Migrations

**Migration 020: Fix Organization Members Access**
- Created `check_organization_membership(org_id, user_id)` function
- SECURITY DEFINER to prevent recursion
- Updated RLS policies on 6 tables
- Fixed organization member access issues

**Migration 021: Separate Payment Systems**
- Renamed `payments` → `rent_payments`
- Created `subscription_payments` table
- Added 3 columns to `organizations` table
- Created 8 new RLS policies
- Updated existing payment policies

**Total Migrations: 21**

---

#### 📚 Documentation

**New Documentation**
- `FIXES_APPLIED_20251130.md` - Complete fix explanation
- `TENANT_SYSTEMS_COMPLETE.md` - Tenant system docs
- `SMTP_AND_FILE_STORAGE_SETUP.md` - Email & storage setup

**Documentation Reorganization**
- Moved all docs to `/docs` directory
- Removed outdated documentation:
  - ❌ FIXES_IN_PROGRESS.md (obsolete)
  - ❌ REPAIR_COMPLETE_SUMMARY.md (obsolete)
  - ❌ SYSTEM_AUDIT_V2.md (obsolete)
  - ❌ IMPLEMENTATION_SUMMARY.md (consolidated)
  - ❌ SECURITY_FIXES_V1.6.0.md (consolidated)
  - ❌ V1.6.0_RELEASE_NOTES.md (consolidated)
- Kept current documentation:
  - ✅ ADMIN_HIERARCHY_GUIDE.md
  - ✅ FEATURES.md
  - ✅ QUICK_START.md
  - ✅ SUPER_ADMIN_SETUP.md
  - ✅ SMTP_AND_FILE_STORAGE_SETUP.md
  - ✅ VERSION_HISTORY.md (this file)
  - ✅ FIXES_APPLIED_20251130.md
  - ✅ TENANT_SYSTEMS_COMPLETE.md

---

#### 🎯 Breaking Changes

**Payment Table Rename**
- `payments` → `rent_payments`
- All services updated to use new table name
- If you have custom queries, update them to use `rent_payments`

**Payment System Architecture**
- Organizations now manage their own payment providers
- Subscription billing is completely separate
- Two distinct payment flows

---

#### 🚀 Technical Details

**Build Status**
- Build Time: 8.17s
- Bundle Size: 643.04 kB (gzip: 152.05 kB)
- TypeScript Errors: 0
- Runtime Errors: 0

**Database Objects Created**
- 2 new tables (subscription_payments, rental_applications)
- 1 new function (check_organization_membership)
- 3 new columns (organizations payment provider config)
- 25+ new RLS policies
- 5 new frontend pages
- 3 new services

**Total Code Added**
- ~4,500 lines of new code
- 16+ new files
- 5 updated services
- 2 database migrations

---

#### 📦 Upgrade Instructions

**From v1.8.0 to v2.1.0:**

1. **Database migrations will run automatically**
   - Migration 020: RLS fixes
   - Migration 021: Payment system separation

2. **No code changes required** - All services updated

3. **Configure payment providers (optional):**
   - Navigate to Organization Settings
   - Add your Stripe/PayPal/Square credentials
   - Enable online rent collection

4. **Review payment data:**
   - All existing payments are now in `rent_payments`
   - Subscription payments will be in `subscription_payments`

---

## v1.8.0-beta (2025-11-30)

### ✨ Major Feature: Dynamic Package Tier Management System

**Super Admin Package Control**
- Full CRUD operations for package tiers (Basic, Professional, Enterprise, etc.)
- Define pricing (monthly/annual in cents for exact control)
- Set limits: properties, tenants, users, payment methods
- Configure feature flags per package
- Automatic version tracking when packages are modified

**Organization-Specific Overrides**
- Custom pricing for individual clients
- Custom limit overrides (properties, tenants, users, etc.)
- Override notes for tracking why custom settings were applied
- Flexible billing cycles (monthly/annual)
- Settings persist even when base packages change

**Version Control & Change Management**
- Automatic snapshots created when packages are modified
- Historical version tracking for all package changes
- Organizations stay on their current version when packages update
- Upgrade notification system (foundation implemented)
- Old customers keep old pricing until they opt-in to changes

**Dynamic Pricing Page**
- Pricing page reads directly from database
- Real-time package updates without code changes
- Automatically displays current pricing and features
- Featured package highlighting
- Professional presentation of all package details

**Super Admin UI**
- `/super-admin/packages` - Manage all package tiers
- `/super-admin/organizations/:id/package` - Set custom org settings
- "Packages" button in Super Admin Dashboard
- "Manage Package" button for each organization
- Comprehensive package editing interface
- View package version history

### 🗃️ Database Schema
- Migration 016: Complete package tier management system
- Tables: package_tiers, package_tier_versions, organization_package_settings, package_upgrade_notifications
- RLS policies for secure access control
- Automatic versioning triggers
- Seeded with default packages

### 🔧 Services
- `packageTierService.ts` - Complete package management API
- CRUD operations for packages
- Organization package settings management
- Effective settings calculation (custom vs default)
- Package limit checking
- Version management

### 🎯 Use Cases Enabled
1. **Super admin** creates "Premium" tier with custom pricing
2. **Super admin** gives "Company A" custom 50-property limit
3. **Super admin** updates "Professional" pricing from $79→$89
4. **Existing customers** stay at $79 until they accept the update
5. **New signups** automatically get new $89 pricing
6. **Super admin** disables old packages without affecting existing users

### 📊 Technical Details
- Package tiers versioned automatically on update
- Organizations reference specific package versions
- Custom overrides stored separately from base packages
- Pricing stored in cents for precision
- Feature flags in JSONB for flexibility
- Full audit trail via versions table

---

## v1.7.4-beta (2025-11-30)

### 🐛 Bug Fix
- **Fixed "Switch to Admin Org" not actually switching context**
  - Button was reloading but staying on Super Admin panel
  - Now saves admin org ID to localStorage before reload
  - Navigates to dashboard then reloads
  - AuthContext properly picks up admin org on reload
  - User successfully switches to admin organization context

### 🎨 UI Improvements
- Removed unnecessary alert dialog
- Smoother transition to admin org

---

## v1.7.3-beta (2025-11-30)

### 🐛 Critical Bug Fix
- **Fixed infinite recursion in organization queries (500 error)**
  - Error: "infinite recursion detected in policy for relation organizations"
  - Occurred when loading dashboard or switching to admin org
  - Root cause: RLS policy called `check_organization_membership()` which queried `organization_members`, creating circular dependency
  - Solution: Removed the recursive policy
  - Dashboard now loads without errors

### 🔒 Security Impact
- Users can see organizations where they are owner OR super admin
- More restrictive but prevents recursion and maintains security

### 🗃️ Database
- Migration 015: Remove recursive organization membership policy

---

## v1.7.2-beta (2025-11-30)

### 🐛 Bug Fixes
- **Fixed "Switch to Admin Org" button failure**
  - Missing required `slug` field in organization creation
  - Updated `get_or_create_admin_org()` RPC function
  - Admin organization now creates successfully

- **Fixed Quick Platform Actions buttons**
  - Added onClick handlers to all action buttons
  - "View Platform Settings" now navigates to System Config
  - "Create Notification" and "Manage Admins" show "coming soon" alerts

### 🎨 UI Improvements
- **Better error messages**
  - More descriptive error alerts for admin org switching
  - Console error logging for debugging

### 🗃️ Database
- Migration 014: Fix admin org creation with slug field

---

## v1.7.1-beta (2025-11-30)

### 🐛 Critical Bug Fixes
- **Fixed infinite recursion in organizations RLS policy**
  - Super admin policy was causing recursive loops
  - Simplified policy to use direct subquery
  - Users can now load dashboard without errors

- **Fixed type mismatch in `get_all_organizations_admin()` RPC**
  - Column 3 (account_tier) VARCHAR → TEXT casting issue
  - Added explicit type casting for all return columns
  - Super Admin Dashboard now loads organization data correctly

### 🎨 UI Improvements
- **Added navigation back buttons**
  - Super Admin Dashboard → Back to Dashboard
  - System Configuration → Back to Super Admin Dashboard
  - Hover effects on back button icons

### 📦 Version System
- **Dynamic versioning footer**
  - Displays on all pages (authenticated + public)
  - Format: `v1.7.1-beta (2025-11-30)`
  - Automatic version string generation

### 🗃️ Database
- Migration 013: Fix recursion and RPC types

---

## v1.7.0-beta (2025-11-30)

### 🆕 New Features
- **Admin Hierarchy System**
  - Three-tier admin structure: System Admin, SaaS Admin, Both
  - Role-based permissions and access control
  - Admin type badges (Blue, Green, Purple)
  - `get_admin_type()` RPC function

- **Admin Organization Mode**
  - Special admin organization for testing/demos
  - "Switch to Admin Org" button in Super Admin Dashboard
  - Automatic creation and member management
  - Excluded from customer statistics

- **Enhanced Super Admin Dashboard**
  - System Config button for quick access
  - Admin type display with color-coded badges
  - Platform-wide statistics display
  - Organization management table

### 🔧 Technical Improvements
- Added `organizations.is_admin_org` column
- Added `super_admins.admin_type` column
- Created 5 new RPC functions:
  - `get_admin_type()`
  - `get_all_organizations_admin()`
  - `get_platform_statistics()`
  - `get_or_create_admin_org()`
  - `create_saas_admin()`
- Added indexes for admin type lookups

### 📚 Documentation
- `ADMIN_HIERARCHY_GUIDE.md` - Complete admin system docs
- `SUPER_ADMIN_SETUP.md` - Quick setup guide

### 🗃️ Database
- Migration 012: Admin hierarchy and functions

---

## v1.6.1-beta (2025-11-30)

### 🐛 Bug Fixes
- **Performance Optimization (21 RLS policies)**
  - Changed `auth.uid()` to `(SELECT auth.uid())`
  - 10-40x faster queries at scale
  - Fixed RLS initialization issues

- **Security Fixes**
  - Added missing foreign key indexes (2)
  - Fixed function search path vulnerability
  - Locked `user_is_org_admin()` search path

### 🔧 Technical Improvements
- Added `idx_system_settings_updated_by` index
- Added `idx_organization_settings_updated_by` index
- Optimized all organization RLS policies
- Optimized maintenance request policies
- Optimized system settings policies

### 📚 Documentation
- `SECURITY_FIXES_V1.6.0.md` - Complete security audit

### 🗃️ Database
- Migration 011: Security and performance fixes

---

## v1.6.0-beta (2025-11-30)

### 🆕 Major Features

#### AI Rent Optimization Engine
- Property-by-property rent analysis
- Multi-factor algorithm (occupancy, payments, maintenance, inflation)
- Confidence scores (0-100%)
- Market positioning analysis
- Potential revenue impact calculations
- New page: `/rent-optimization`

#### Cash Flow Forecast Visualization
- 6-month income vs expenses predictions
- Beautiful dual-bar chart
- Confidence levels per month
- Based on historical patterns
- Integrated into Reports page

#### Automated Lease Renewal Intelligence
- Detects leases expiring in 90 days
- Renewal probability scoring (0-100%)
- Tenant quality assessment
- AI-suggested renewal rent
- Dashboard widget with urgency indicators

#### System Configuration Panel
- Payment gateway setup (Stripe, Square, PayPal)
- API key management
- Feature flag system
- New page: `/super-admin/config`

### 🔧 Services Added
- `rentOptimizationService.ts`
- `leaseRenewalService.ts`
- `systemSettingsService.ts`

### 📊 Dashboard Enhancements
- Lease Renewals widget
- Enhanced portfolio health display
- Payment risk alerts integration

### 🗃️ Database
- Migration 010: System configuration tables
  - `system_settings` table
  - `organization_settings` table
  - Feature flags and payment gateway config

### 📚 Documentation
- `V1.6.0_RELEASE_NOTES.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Business value summary
- `FEATURES.md` - Updated feature list

---

## v1.5.0-beta (2025-11-28 to 2025-11-29)

### 🆕 Major Features

#### Smart Maintenance Request System
- Complete maintenance workflow
- Priority levels and status tracking
- Vendor management
- Cost tracking
- New page: `/maintenance`

#### Payment Risk Prediction
- ML-like algorithm for risk scoring
- Identifies at-risk tenants
- Personalized recommendations
- Dashboard integration

#### Portfolio Health Score
- Real-time 0-100 health score
- Weighted algorithm (occupancy, collection, ROI, maintenance)
- Health level indicators
- Actionable recommendations

#### Enhanced Dashboard
- Portfolio health widget
- Payment risk alerts
- Smart recommendations
- Key metrics display

### 🔧 Services Added
- `maintenanceService.ts`
- `paymentPredictionService.ts`
- `portfolioHealthService.ts`
- `leaseService.ts`

### 🗃️ Database
- Migration 009: Maintenance requests system
  - `maintenance_requests` table
  - `maintenance_vendors` table
  - Full RLS policies

### 🎨 UI Improvements
- Modern landing page
- SEO optimization
- Enhanced navigation

---

## v1.0.0-beta (2025-11-28)

### 🎉 Initial Release

#### Core Features
- User authentication (Supabase Auth)
- Organization management
- Multi-tenant architecture
- Property management
- Tenant management
- Lease management
- Payment tracking
- Expense management
- Reports and analytics

#### Admin System
- Super Admin role
- Organization subscriptions
- Account tiers (starter, professional, enterprise)
- Platform settings

#### Database
- Migrations 001-008
- Full RLS security
- Optimized indexes
- Multi-tenant isolation

#### UI/UX
- React + TypeScript
- Tailwind CSS
- Responsive design
- Dark sidebar navigation

---

## Version Update Guidelines

### When to Bump MAJOR (x.0.0):
- Breaking database changes
- API changes that break existing clients
- Major architecture changes
- Removal of features

### When to Bump MINOR (1.x.0):
- New features added
- New pages/routes added
- New database tables
- Backwards-compatible enhancements
- New RPC functions

### When to Bump PATCH (1.0.x):
- Bug fixes
- Performance improvements
- Security patches
- Documentation updates
- UI/UX polish
- Index additions

### How to Update Version:

1. **Edit `src/lib/version.ts`:**
```typescript
export const VERSION = {
  major: 1,
  minor: 7,  // Increment this for new features
  patch: 0,  // Increment this for bug fixes
  prerelease: 'beta',
  buildDate: '2025-11-30', // Update to current date
};
```

2. **Update `VERSION_HISTORY.md`:**
- Add new section at top
- Document all changes
- Use emoji categories (🆕 🐛 🔧 📚 🗃️)

3. **Build and Test:**
```bash
npm run build
```

4. **Commit:**
```bash
git commit -m "chore: bump version to v1.7.1-beta"
```

---

## Prerelease Tags

- **alpha** - Very early, unstable
- **beta** - Feature complete, testing in progress
- **rc** (release candidate) - Ready for production, final testing
- (none) - Stable production release

**Current Status:** `beta` - Feature complete, testing with beta users

---

## Roadmap

### v1.7.x (Current Beta)
- [ ] Document storage (v1.7.1)
- [ ] Email notifications (v1.7.2)
- [ ] Tenant portal (v1.7.3)
- [ ] Payment gateway webhooks (v1.7.4)

### v1.8.0 (Next Minor)
- Actual payment processing (Stripe, Square, PayPal)
- Automated payment recording
- Webhook handlers
- Receipt generation

### v1.9.0
- Mobile app / PWA
- Offline capability
- Push notifications
- Advanced analytics

### v2.0.0 (Major)
- Multi-language support
- White label options
- Enterprise features
- Advanced automation

---

## Footer Display

Version is displayed in footer of all pages:
- **Format:** `v1.7.0-beta (2025-11-30)`
- **Location:** Bottom right of every page
- **Style:** Monospace font in gray box

---

*Last Updated: 2025-11-30*
*Maintained by: RentTrack Development Team*

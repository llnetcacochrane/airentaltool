# GUI Developer Onboarding Guide

## AI Rental Tools - Frontend Development Guide

**Version:** 2.8.x-beta
**Last Updated:** December 2025
**Target Audience:** GUI/Frontend Developers

---

## Table of Contents

1. [Application Purpose and Vision](#1-application-purpose-and-vision)
2. [Two Client Types - CRITICAL](#2-two-client-types---critical)
3. [Service Tiers and Pricing Model](#3-service-tiers-and-pricing-model)
4. [Sales Model](#4-sales-model)
5. [Tech Stack](#5-tech-stack)
6. [Key UI/UX Principles](#6-key-uiux-principles)
7. [Important Files and Architecture](#7-important-files-and-architecture)
8. [Current State of Development](#8-current-state-of-development)
9. [Quick Reference](#9-quick-reference)

---

## 1. Application Purpose and Vision

### What AI Rental Tools Does

AI Rental Tools is a **SaaS property management platform** that helps rental property owners and property management companies manage their real estate portfolios efficiently. It's a multi-tenant application where multiple organizations operate independently on the same platform.

### Who It Serves

1. **Direct Landlords** - Individual property owners managing their own rental properties
2. **Property Management Companies** - Professional firms managing properties on behalf of multiple property owner clients

### The Problem It Solves

- **Centralized Property Management** - One place for properties, tenants, leases, payments, maintenance
- **AI-Powered Intelligence** - Rent optimization, payment risk prediction, portfolio health scoring
- **Tenant Self-Service** - Portal for tenants to pay rent, submit maintenance requests, view documents
- **Automation** - Lease renewals, payment reminders, application processing
- **Financial Tracking** - Income, expenses, cash flow forecasting, reporting

### Core Value Propositions

- Increase revenue by 5-15% with AI rent optimization
- Reduce late payments by 40% with predictive alerts
- Save 60% of time on maintenance coordination
- Improve collection rates to 95%+
- Instant portfolio health visibility

---

## 2. Two Client Types - CRITICAL

**This is the most important concept for UI development.** The application serves two fundamentally different client types, and the UI must adapt accordingly.

### Client Type 1: Landlord (single_company package)

**Who they are:** Individual property owners managing their own rentals.

**Data Hierarchy:**
```
Organization (their account)
  └── Business (their rental business entity)
        └── Properties
              └── Units
                    └── Tenants
```

**UI Characteristics:**
- Simpler navigation - they don't need "Clients" page
- "Businesses" shows their own rental business entity(ies)
- Direct management of Properties > Units > Tenants
- Focus on property performance metrics

**Navigation Items (Landlord):**
- Dashboard
- Businesses (their own)
- Properties
- Tenants
- Applications
- Agreements
- Payments
- Expenses
- Maintenance
- Reports

### Client Type 2: Property Manager (management_company package)

**Who they are:** Professional property management companies managing properties for multiple property owner clients.

**Data Hierarchy:**
```
Organization (the PM company)
  └── Clients (Property Owners they serve)
        └── Portfolios (client's property collections)
              └── Properties
                    └── Units
                          └── Tenants
```

**UI Characteristics:**
- Shows "Clients" page in navigation (route: `/property-owners`)
- Must be able to switch between client contexts
- Reporting needs per-client breakdowns
- May have white-label branding for each client

**Navigation Items (Property Manager):**
- Dashboard
- **Clients** (their property owner clients) - ONLY FOR THIS TYPE
- Businesses
- Properties
- Tenants
- Applications
- Agreements
- Payments
- Expenses
- Maintenance
- Reports

### How to Detect Client Type in Code

```typescript
// From AuthContext
const {
  packageType,    // 'single_company' | 'management_company'
  clientType,     // 'landlord' | 'property_manager'
  isLandlord,     // boolean shorthand
  isPropertyManager // boolean shorthand
} = useAuth();

// Conditional UI based on client type
if (isPropertyManager) {
  // Show Clients navigation item
  // Enable client switching
  // Show per-client reporting
}
```

### Conditional Navigation Example (from Layout.tsx)

```typescript
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  // This item ONLY shows for property managers
  { name: 'Clients', href: '/property-owners', icon: UserCheck, packageType: 'management_company' },
  { name: 'Businesses', href: '/businesses', icon: Briefcase },
  { name: 'Properties', href: '/properties', icon: Building2 },
  // ... rest of navigation
];
```

### UI Terminology Differences

| Concept | Landlord View | Property Manager View |
|---------|--------------|----------------------|
| Their customers | Tenants | Clients (Property Owners) |
| Top-level entity | Business | Client |
| Page title for owners | Property Owners | Clients |
| Add button text | Add Owner | Add Client |

---

## 3. Service Tiers and Pricing Model

### Package Types

The system has two categories of packages:

1. **single_company** - For direct landlords
2. **management_company** - For property management companies

### Tier Structure (Landlord - single_company)

| Tier | Properties | Units | Tenants | Key Features |
|------|-----------|-------|---------|--------------|
| Free | 1 | 2 | 2 | Basic features, no credit card |
| Starter | 5 | 20 | 20 | Core features |
| Professional | 25 | 100 | 100 | Advanced reporting, priority support |
| Enterprise | Unlimited | Unlimited | Unlimited | White-label, API access |

### Tier Structure (Property Manager - management_company)

| Tier | Client Businesses | Units | Staff Users | Key Features |
|------|------------------|-------|-------------|--------------|
| Starter PM | 5 | 50 | 3 | Basic PM features |
| Professional PM | 25 | 250 | 10 | Full features |
| Enterprise PM | Unlimited | Unlimited | Unlimited | White-label, API |

### How Tiers Affect the UI

**1. Feature Gating**

```typescript
// From packageTierService.ts
interface PackageTier {
  features: {
    advanced_reporting?: boolean;
    white_label?: boolean;
    api_access?: boolean;
    priority_support?: boolean;
    ai_features?: boolean;
  };
}

// Check if feature is enabled
if (packageTier?.features?.advanced_reporting) {
  // Show advanced reporting options
}
```

**2. Usage Limits Display**

The `UsageLimitsWidget` component shows:
- Current usage vs. limits (properties, units, tenants)
- Progress bars with color coding:
  - Green: < 60% capacity
  - Yellow: 60-79% capacity
  - Orange: 80-99% capacity
  - Red: At/over limit
- Upgrade prompts when approaching limits

**3. UpgradePrompt Component**

When a user hits a limit, show the `UpgradePrompt` modal:

```typescript
import { UpgradePrompt } from '../components/UpgradePrompt';

// When limit is reached during creation
const handleCreate = async () => {
  try {
    await service.create(data);
  } catch (error) {
    if (error.message.includes('limit')) {
      setShowUpgradePrompt(true);
      setLimitType('properties'); // or 'units', 'tenants'
    }
  }
};
```

**4. Add-Ons System**

Users can purchase individual add-ons instead of upgrading:
- Extra Property: $10/month
- Extra Unit: $3/month
- Extra Tenant: $2/month
- Extra Team Member: $8/month
- Extra Business: $15/month

Route: `/addons`

---

## 4. Sales Model

### Super Admin Role

The platform has a Super Admin role (the SaaS operator) who:
- Manages all client organizations
- Sets pricing and package configurations
- Configures payment gateways (Stripe, Square, PayPal)
- Monitors platform health and statistics
- Can impersonate organizations for support

**Super Admin Routes:**
- `/super-admin` - Main dashboard
- `/super-admin/config` - System configuration
- `/super-admin/packages` - Package tier management
- `/super-admin/users` - User management
- `/super-admin/ai-keys` - AI API key configuration

### How Super Admin Sells to Clients

1. Client signs up (free tier available)
2. Super Admin can:
   - Assign specific package tiers
   - Set custom pricing per organization
   - Set custom limits (override tier defaults)
   - Extend trials
   - Manage subscription status (active, trial, suspended)

### White-Label/Branding Capabilities

**System Branding (Super Admin controls):**
- Application name
- Logo URL
- Favicon
- Primary color
- Support email/phone

**Organization Branding (Per-client customization):**
- Custom application name
- Custom logo
- Custom colors
- `white_label_enabled` flag must be true

**BrandingContext Usage:**

```typescript
import { useBranding } from '../context/BrandingContext';

function MyComponent() {
  const { branding } = useBranding();

  return (
    <div>
      <img src={branding.logo_url} alt={branding.application_name} />
      <span style={{ color: branding.primary_color }}>
        {branding.application_name}
      </span>
    </div>
  );
}
```

### Tenant Portal as Value-Add

The tenant portal (`/my-rental/*`) is a key selling point:
- Tenants can pay rent online
- Submit and track maintenance requests
- View lease documents
- Message landlord/property manager
- Update their profile

This creates value for landlords (automated collection) AND tenants (convenience).

---

## 5. Tech Stack

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.x |
| TypeScript | Type Safety | 5.x |
| Vite | Build Tool | 5.x |
| Tailwind CSS | Styling | 3.x |
| Supabase | Backend (Auth, DB, Storage) | Latest |
| React Router | Navigation | 6.x |

### Key Libraries

```json
{
  "lucide-react": "Icons",
  "recharts": "Charts/graphs",
  "date-fns": "Date manipulation",
  "jspdf": "PDF generation",
  "html2canvas": "Screenshots for PDFs",
  "signature_pad": "Digital signatures"
}
```

### Project Structure

```
src/
  ├── components/       # Reusable UI components
  ├── context/          # React Context providers
  ├── pages/            # Page components (routes)
  │   └── tenant/       # Tenant portal pages
  ├── services/         # API/business logic
  ├── types/            # TypeScript type definitions
  ├── lib/              # Utilities (supabase client, etc.)
  └── App.tsx           # Main app with routing
```

### Tailwind Configuration

The app uses default Tailwind with these patterns:
- Blue-600 as primary action color
- Gray scale for text and backgrounds
- Rounded corners: `rounded-lg` (standard), `rounded-xl` (cards)
- Shadows: `shadow-sm` (subtle), `shadow` (standard), `shadow-lg` (elevated)

---

## 6. Key UI/UX Principles

### Responsive Design Pattern

**Mobile: Card-based layout**
```tsx
{/* Mobile: Full-width cards */}
<div className="grid grid-cols-1 gap-4">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>
```

**Desktop: Table-based layout**
```tsx
{/* Desktop: Hidden on mobile, shown on lg+ */}
<table className="hidden lg:table w-full">
  <thead>...</thead>
  <tbody>...</tbody>
</table>

{/* Mobile: Shown on mobile, hidden on lg+ */}
<div className="lg:hidden">
  {/* Card layout */}
</div>
```

**Common Breakpoints:**
- `sm:` - 640px (small tablets)
- `md:` - 768px (tablets)
- `lg:` - 1024px (desktop)
- `xl:` - 1280px (large desktop)

### Empty States

Use the `EmptyState` component for pages with no data:

```typescript
import { EmptyState, EmptyStatePresets } from '../components/EmptyState';

// Option 1: Use preset
{properties.length === 0 && EmptyStatePresets.Properties(() => setShowForm(true))}

// Option 2: Custom empty state
<EmptyState
  icon={<Building2 className="w-16 h-16 text-gray-300" />}
  title="No Properties Yet"
  description="Start by adding your first property."
  actions={[
    { label: 'Add Property', onClick: handleAdd, primary: true }
  ]}
  tips={[
    { title: 'Tip 1', description: 'Helpful hint' }
  ]}
/>
```

**EmptyState Variants:**
- `default` - Full featured with tips section
- `card` - Compact card style
- `minimal` - Simple centered text

### Loading States

**Full Page Loading:**
```typescript
import { LoadingSpinner } from '../components/LoadingSpinner';

if (isLoading) {
  return <LoadingSpinner fullPage message="Loading properties..." />;
}
```

**Inline Loading:**
```typescript
<LoadingSpinner size="sm" inline />
```

**Skeleton Loading:**
```typescript
import { SkeletonCard, SkeletonTable } from '../components/LoadingSpinner';

if (isLoading) {
  return <SkeletonTable rows={5} />;
}
```

**Button Loading:**
```typescript
import { LoadingButton } from '../components/LoadingSpinner';

<LoadingButton
  loading={isSubmitting}
  loadingText="Saving..."
  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
  onClick={handleSubmit}
>
  Save Changes
</LoadingButton>
```

### Toast Notifications

```typescript
import { useToast } from '../components/Toast';

function MyComponent() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast.success('Saved!', 'Your changes have been saved.');
    } catch (error) {
      toast.error('Error', 'Failed to save changes.');
    }
  };
}
```

**Toast Types:**
- `toast.success(title, message?)` - Green, 3s duration
- `toast.error(title, message?)` - Red, 5s duration
- `toast.warning(title, message?)` - Amber, 3s duration
- `toast.info(title, message?)` - Blue, 3s duration

### Form Validation

**Field Error Component:**
```typescript
import { FieldError } from '../components/FieldError';

<div>
  <label>Email</label>
  <input
    type="email"
    className={`border ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
  />
  <FieldError error={errors.email} />
</div>
```

**Standard Input Styling:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg
             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### Modal Pattern

```tsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Modal Title</h2>
        <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Form fields */}
      </div>

      {/* Footer */}
      <div className="flex gap-3 mt-6">
        <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Save
        </button>
      </div>
    </div>
  </div>
)}
```

### Page Header Pattern

```tsx
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6
                  flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Page Title</h1>
      <p className="text-sm sm:text-base text-gray-600 mt-1">Description text</p>
    </div>
    <button className="flex items-center justify-center gap-2 bg-blue-600 text-white
                       px-4 py-2 rounded-lg hover:bg-blue-700 transition
                       w-full sm:w-auto">
      <Plus size={20} />
      Add Item
    </button>
  </div>
</div>
```

---

## 7. Important Files and Architecture

### Context Providers

**AuthContext** (`/src/context/AuthContext.tsx`)

The primary context for authentication and authorization:

```typescript
const {
  // User info
  supabaseUser,        // Supabase auth user object
  userProfile,         // User profile from users table

  // Organization info
  currentOrganization, // Current org the user is viewing
  organizations,       // All orgs user belongs to
  currentMember,       // User's membership in current org
  currentRole,         // 'owner' | 'admin' | 'property_manager' | 'accounting' | 'viewer'

  // Special roles
  isSuperAdmin,        // Is this user a super admin?
  isPropertyOwner,     // Is this user a property owner (read-only)?

  // Package/Client type
  packageTier,         // Full package tier object
  packageType,         // 'single_company' | 'management_company'
  clientType,          // 'landlord' | 'property_manager'
  isLandlord,          // Shorthand boolean
  isPropertyManager,   // Shorthand boolean

  // State
  isLoading,
  isAuthenticated,

  // Actions
  login,
  register,
  logout,
  switchOrganization,
  createOrganization,

  // Permission checks
  hasPermission,       // Check specific permission
  canManageProperties,
  canManagePayments,
  canViewReports,
  canManageClients,    // Property manager only
  canManageBusinesses,
} = useAuth();
```

**PortfolioContext** (`/src/context/PortfolioContext.tsx`)

Manages the portfolio-first architecture:

```typescript
const {
  currentPortfolio,    // Active portfolio
  portfolios,          // All user portfolios
  loading,
  error,
  setCurrentPortfolio, // Switch portfolios
  refreshPortfolios,
  needsOrganization,   // Does user need to create org?
} = usePortfolio();
```

**TenantContext** (`/src/context/TenantContext.tsx`)

For users who are tenants (accessing tenant portal):

```typescript
const {
  isTenantUser,        // Is current user a tenant?
  tenantData,          // Full tenant data with unit/property info
  isLoading,
  error,
  refreshTenantData,
} = useTenant();
```

**BrandingContext** (`/src/context/BrandingContext.tsx`)

For white-label branding:

```typescript
const {
  branding: {
    application_name,
    logo_url,
    favicon_url,
    primary_color,
    support_email,
    support_phone,
    white_label_enabled,
  },
  isLoading,
  refreshBranding,
} = useBranding();
```

### Key Page Files

| Route | File | Purpose |
|-------|------|---------|
| `/dashboard` | `OperationsCenter.tsx` | Main dashboard |
| `/properties` | `Properties.tsx` | Property list/management |
| `/tenants` | `Tenants.tsx` | Tenant list/management |
| `/property-owners` | `PropertyOwners.tsx` | Client management (PM only) |
| `/businesses` | `BusinessesList.tsx` | Business entity management |
| `/payments` | `Payments.tsx` | Payment tracking |
| `/expenses` | `Expenses.tsx` | Expense tracking |
| `/maintenance` | `Maintenance.tsx` | Maintenance requests |
| `/applications` | `Applications.tsx` | Rental applications |
| `/agreements` | `Agreements.tsx` | Lease agreements |
| `/reports` | `Reports.tsx` | Financial reports |
| `/settings` | `Settings.tsx` | Organization settings |
| `/addons` | `Addons.tsx` | Add-on purchases |
| `/rent-optimization` | `RentOptimization.tsx` | AI rent recommendations |

**Tenant Portal Pages** (`/src/pages/tenant/`):
- `TenantDashboard.tsx` - `/my-rental`
- `TenantPayments.tsx` - `/my-rental/payments`
- `TenantMaintenance.tsx` - `/my-rental/maintenance`
- `TenantDocuments.tsx` - `/my-rental/documents`
- `TenantMessages.tsx` - `/my-rental/messages`
- `TenantProfile.tsx` - `/my-rental/profile`

### Key Component Files

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Main app layout with sidebar |
| `TenantLayout.tsx` | Tenant portal layout |
| `ProtectedRoute.tsx` | Auth guard for routes |
| `EmptyState.tsx` | Empty state displays |
| `LoadingSpinner.tsx` | Loading indicators and skeletons |
| `Toast.tsx` | Toast notification system |
| `FieldError.tsx` | Form field error display |
| `PropertyForm.tsx` | Property add/edit form |
| `TenantForm.tsx` | Tenant add/edit form |
| `UnitManagement.tsx` | Unit CRUD within property |
| `PortfolioSelector.tsx` | Portfolio switching dropdown |
| `UsageLimitsWidget.tsx` | Plan usage display |
| `UpgradePrompt.tsx` | Limit reached modal |

### Service Files

All API interactions go through service files in `/src/services/`:

| Service | Purpose |
|---------|---------|
| `authService.ts` | Authentication |
| `propertyService.ts` | Property CRUD |
| `tenantService.ts` | Tenant CRUD |
| `unitService.ts` | Unit CRUD |
| `paymentService.ts` | Payment tracking |
| `expenseService.ts` | Expense tracking |
| `maintenanceService.ts` | Maintenance requests |
| `leaseService.ts` | Lease management |
| `businessService.ts` | Business entity CRUD |
| `clientService.ts` | Client management (PM) |
| `portfolioService.ts` | Portfolio operations |
| `packageTierService.ts` | Package/tier management |
| `brandingService.ts` | Branding configuration |
| `agreementService.ts` | Digital agreements |
| `rentalApplicationService.ts` | Application processing |
| `rentOptimizationService.ts` | AI rent recommendations |
| `portfolioHealthService.ts` | Portfolio health scoring |
| `paymentPredictionService.ts` | Payment risk prediction |

### Type Definitions

All shared types are in `/src/types/index.ts`:

- `UserRole` - owner, admin, property_manager, accounting, viewer
- `Organization` - Organization data structure
- `Property` - Property data structure
- `Unit` - Unit within property
- `Tenant` - Tenant data structure
- `Lease` - Lease agreement
- `Payment` - Payment record
- `Expense` - Expense record
- `MaintenanceRequest` - Maintenance ticket
- `RentalApplication` - Application data
- And many more...

---

## 8. Current State of Development

### What's Complete

**Core Features:**
- [x] User authentication (Supabase Auth)
- [x] Multi-organization support
- [x] Property management (CRUD)
- [x] Unit management within properties
- [x] Tenant management
- [x] Lease tracking
- [x] Payment recording
- [x] Expense tracking
- [x] Maintenance request system
- [x] Business entity management

**AI Features:**
- [x] Rent optimization recommendations
- [x] Payment risk prediction
- [x] Portfolio health scoring
- [x] Lease renewal intelligence
- [x] Cash flow forecasting

**Advanced Features:**
- [x] Rental application system with AI scoring
- [x] Digital agreement signing
- [x] Tenant portal (basic implementation)
- [x] White-label branding
- [x] Add-on purchasing system
- [x] Package tier management

**Admin Features:**
- [x] Super Admin dashboard
- [x] System configuration
- [x] Package management
- [x] AI API key management

### What Needs Polish

**UI/UX Improvements Needed:**

1. **Mobile Responsiveness**
   - Some modals need better mobile layouts
   - Table views need card alternatives on all pages
   - Touch targets could be larger on mobile

2. **Loading States**
   - Some pages lack skeleton loaders
   - Inconsistent loading indicator styles

3. **Empty States**
   - Not all pages use the EmptyState component consistently
   - Some empty states lack helpful tips

4. **Form Validation**
   - Some forms lack real-time validation
   - Error messages could be more specific

5. **Accessibility**
   - Missing ARIA labels in some places
   - Keyboard navigation needs improvement
   - Focus management in modals

### Known UI Issues

1. **Portfolio Selector** - May not always reflect when switching portfolios
2. **Navigation** - Active state doesn't always highlight correctly
3. **Modal Z-Index** - Occasionally modals overlap incorrectly
4. **Toast Position** - Can overlap with fixed footer on mobile
5. **Date Pickers** - Inconsistent styling across different date inputs

### Areas Needing Improvement

1. **Tenant Portal** - Needs more features and polish
2. **Reports Page** - Charts need better mobile handling
3. **Settings Page** - Overwhelming, needs better organization
4. **Dashboard Widgets** - Some widgets lack responsive design
5. **Print Styles** - No print stylesheets for reports

---

## 9. Quick Reference

### Common Tailwind Classes

```css
/* Buttons */
.btn-primary: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
.btn-secondary: "bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
.btn-danger: "bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"

/* Cards */
.card: "bg-white rounded-lg shadow p-6"
.card-elevated: "bg-white rounded-xl shadow-lg p-6"

/* Status Badges */
.badge-success: "px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full"
.badge-warning: "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full"
.badge-danger: "px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full"
.badge-info: "px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full"

/* Inputs */
.input: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

### Icon Usage

All icons come from `lucide-react`:

```typescript
import {
  Building2,    // Properties
  Users,        // Tenants
  CreditCard,   // Payments
  Wrench,       // Maintenance
  FileText,     // Documents/Agreements
  BarChart3,    // Reports
  Settings,     // Settings
  Plus,         // Add actions
  Edit2,        // Edit
  Trash2,       // Delete
  X,            // Close
  Check,        // Success/checkbox
  AlertCircle,  // Error
  AlertTriangle,// Warning
  Info,         // Info
  ChevronDown,  // Dropdown
  ChevronRight, // Navigate
  Loader2,      // Loading spinner
} from 'lucide-react';

// Usage
<Building2 size={20} className="text-gray-600" />
```

### File Naming Conventions

- **Pages:** PascalCase (`Properties.tsx`, `TenantDashboard.tsx`)
- **Components:** PascalCase (`EmptyState.tsx`, `LoadingSpinner.tsx`)
- **Services:** camelCase (`propertyService.ts`, `authService.ts`)
- **Context:** PascalCase with "Context" suffix (`AuthContext.tsx`)
- **Types:** PascalCase, in `types/index.ts`

### Development Commands

```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Getting Started Checklist

1. [ ] Clone the repository
2. [ ] Install dependencies: `npm install`
3. [ ] Copy `.env.example` to `.env` and add Supabase credentials
4. [ ] Run `npm run dev`
5. [ ] Read this document thoroughly
6. [ ] Familiarize yourself with `AuthContext` and `PortfolioContext`
7. [ ] Understand the two client types (landlord vs property manager)
8. [ ] Review the component library (`EmptyState`, `LoadingSpinner`, `Toast`)
9. [ ] Look at existing pages for patterns to follow
10. [ ] Check `types/index.ts` for available TypeScript types

---

## Need Help?

1. Check existing documentation in `/docs/`
2. Review VERSION_HISTORY.md for recent changes
3. Look at similar components/pages for patterns
4. Check TypeScript types in `types/index.ts`

---

*This document is maintained by the AI Rental Tools development team. Last updated December 2025.*

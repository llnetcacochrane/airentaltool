# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Rental Tools (RentTrack) is a property management SaaS platform built with React, TypeScript, and Supabase. It supports landlords and property management companies with AI-powered analytics, tenant management, and payment processing.

## Development Commands

```bash
npm run dev        # Start development server (Vite)
npm run build      # Production build
npm run typecheck  # Type checking with TypeScript
npm run lint       # ESLint
npm run preview    # Preview production build
```

## Deployment

**IMPORTANT:** Nginx serves from `/opt/airentaltools/dist/` - NOT `/var/www/`

```bash
# Build and deploy to production
cd ~/airentaltools-dev
npm run build
sudo rm -rf /opt/airentaltools/dist
sudo cp -r dist /opt/airentaltools/dist
sudo chown -R www-data:www-data /opt/airentaltools/dist
```

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS policies)
- **Build**: Vite
- **Icons**: lucide-react
- **PDF**: jspdf, jspdf-autotable

### Business-Centric Data Model (v4.3+)

The architecture uses a business-first model where users directly own businesses (no organization layer for most users):

```
User
  └─ Business(es)
      └─ Properties
          └─ Units
              └─ Tenants
```

Key points:
- `Business` is the primary organizational entity owned via `owner_user_id`
- Properties belong to businesses via `business_id`
- `organization_id` exists for legacy/backward compatibility but is typically null
- Package tiers control how many businesses/properties a user can create

### Context Providers (wrap order matters)

```
BrowserRouter
  └─ AuthProvider       (Supabase auth, user profile, businesses, package tiers)
      └─ BusinessProvider   (current business selection, backward compat wrapper)
          └─ TenantProvider     (tenant portal context)
              └─ BrandingProvider   (white-label theming)
                  └─ ToastProvider      (notifications)
```

### Key Service Files

Services in `src/services/` interact with Supabase:
- `authService.ts` - Authentication, registration, user profiles
- `businessService.ts` - Business CRUD, limits checking
- `propertyService.ts` - Properties (linked to business_id)
- `unitService.ts` - Units within properties
- `tenantService.ts` - Tenant management
- `packageTierService.ts` - Subscription tier limits

### Route Structure

- `/` - Public landing page
- `/login`, `/register` - Authentication
- `/onboarding` - New user setup
- `/dashboard` - Main operations center (protected)
- `/businesses`, `/properties`, `/tenants`, `/payments`, `/expenses`, `/maintenance` - Core features
- `/super-admin/*` - Platform admin routes
- `/my-rental/*` - Tenant portal routes
- `/apply/:code` - Public rental application flow

### Protected Routes

Use `<ProtectedRoute>` component to wrap authenticated pages. It checks `isAuthenticated` from `useAuth()` hook.

### User Roles & Permissions

From `AuthContext`:
- `isSuperAdmin` - Platform administrator
- `isPropertyOwner` - External property owner (limited access)
- `isLandlord` / `isPropertyManager` - Derived from package type
- Permission helpers: `canManageProperties()`, `canManagePayments()`, `canViewReports()`

## Environment Variables

Required:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## TypeScript Configuration

- Strict mode enabled
- Target ES2020
- No unused locals/parameters allowed
- JSX: react-jsx

## Database Interaction Patterns

All Supabase queries go through service files. Example pattern:
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('business_id', businessId);
```

RLS (Row Level Security) policies enforce access control at the database level based on `auth.uid()`.

## Version Management

Update version in `src/lib/version.ts`. Footer displays version across all pages.

## Security Notes

- Session timeout: 30 minutes of inactivity (configurable in AuthContext)
- Production builds: no source maps, console/debugger statements dropped
- Rate limiting utilities in `src/utils/rateLimiter.ts`
- Form validation in `src/utils/formValidation.ts`

## Responsive Design Requirements (MANDATORY)

**All UI code MUST be mobile-responsive.** See `docs/RESPONSIVE_DESIGN_GUIDE.md` for complete patterns.

### Quick Reference - Required Patterns

**Page Headers:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <h1 className="text-2xl sm:text-3xl font-bold">Title</h1>
  <div className="flex items-center gap-2 sm:gap-3">{/* buttons */}</div>
</div>
```

**Container Padding:**
```tsx
<div className="px-4 sm:px-6 py-4 sm:py-6">
```

**Grids:**
```tsx
// 3-column: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
// 4-column: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

**Buttons with Mobile Text:**
```tsx
<button className="w-full sm:w-auto">
  <span className="hidden sm:inline">Add Property</span>
  <span className="sm:hidden">Add</span>
</button>
```

**Typography:**
```tsx
// Headings: text-2xl sm:text-3xl
// Body: text-sm sm:text-base
// Small: text-xs sm:text-sm
```

### Pre-Commit Checklist

Before any UI changes:
- [ ] Headers stack on mobile (`flex-col sm:flex-row`)
- [ ] Padding is responsive (`px-4 sm:px-6`)
- [ ] No horizontal scroll at 320px width
- [ ] Touch targets are 44x44px minimum
- [ ] Text sizes scale appropriately

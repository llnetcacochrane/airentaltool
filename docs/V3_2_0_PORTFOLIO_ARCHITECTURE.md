# V3.2.0 Beta - Portfolio Architecture

**Status:** 🚧 In Progress
**Date:** December 3, 2025

---

## Overview

V3.2.0 introduces a revolutionary **Portfolio-First Architecture** that eliminates unnecessary complexity for 90% of users while supporting advanced multi-portfolio and property management company use cases.

---

## The Problem We Solved

**Before V3.2.0:**
- Every user forced into "organization" structure
- Confusing hierarchy even for simple landlords
- Organization_id everywhere in the codebase

**After V3.2.0:**
- Simple by default: User → Portfolio → Properties
- Complexity only when needed (multi-portfolio or PM companies)
- Clean, intuitive data model

---

## Architecture Tiers

### **Tier 1: Single Portfolio (90% of users - DEFAULT)**
```
User
  └─ Portfolio (auto-created, transparent)
      └─ Properties
          └─ Units
              └─ Tenants
```

**User Experience:**
- No mention of "portfolios" or "organizations"
- Just "My Properties", "My Tenants", etc.
- Clean, simple interface

---

### **Tier 2: Multi-Portfolio (Power Users)**
```
User
  └─ Organization (created when adding 2nd portfolio)
      ├─ Portfolio 1 (original, auto-migrated)
      ├─ Portfolio 2 (new)
      └─ Portfolio 3+ (unlimited)
```

**Upgrade Trigger:**
- User wants to add 2nd rental business
- Wizard pops up explaining new hierarchy
- System automatically:
  1. Creates organization
  2. Migrates existing portfolio under organization
  3. Creates new portfolio
  4. User can now switch between portfolios

**Use Cases:**
- Own properties in multiple states/countries
- Separate personal vs investment properties
- Different business entities (LLC structures)

---

### **Tier 3: Management Company (Professional PM)**
```
User (PM Company)
  └─ Organization (their PM company)
      ├─ Client 1 (Property Owner: John Doe)
      │   └─ Portfolio (John's properties)
      ├─ Client 2 (Property Owner: Jane Smith)
      │   └─ Portfolio (Jane's properties)
      └─ Client 3+ (unlimited clients)
```

**Features:**
- Manage multiple property owners
- Each client has own portfolio
- Separate reporting per client
- Client portal access

---

## Database Changes

### **New Tables**

#### **portfolios**
```sql
CREATE TABLE portfolios (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  organization_id uuid REFERENCES organizations,  -- Only if multi-portfolio
  client_id uuid REFERENCES clients,              -- Only if Management Company tier
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz
);
```

#### **clients** (Management Company Tier Only)
```sql
CREATE TABLE clients (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);
```

### **Modified Tables**

All core tables now have `portfolio_id`:
- ✅ properties
- ✅ units
- ✅ tenants
- ✅ leases
- ✅ maintenance_requests
- ✅ maintenance_vendors
- ✅ expenses
- ✅ rent_payments
- ✅ rental_listings
- ✅ property_owners

**Migration Strategy:**
- `organization_id` still exists (for backward compatibility)
- `portfolio_id` is primary reference going forward
- RLS policies support both

---

## Helper Functions

### **get_user_default_portfolio(user_id)**
- Returns user's default portfolio
- Auto-creates one if doesn't exist
- Called automatically on signup

### **user_needs_organization(user_id)**
- Returns true if user has 2+ portfolios
- Used to show/hide organization features
- Determines UI complexity level

### **get_user_portfolios(user_id)**
- Returns all portfolios for user
- Includes property counts
- Sorted by default first

---

## Service Layer Updates

### **✅ Completed Services:**

#### **portfolioService.ts** (NEW)
```typescript
- getUserDefaultPortfolio()      // Get user's main portfolio
- getUserPortfolios()            // Get all user portfolios
- createPortfolio()              // Add new portfolio
- getClients()                   // Management Company: list clients
- createClient()                 // Management Company: add client
- createClientPortfolio()        // Create portfolio for client
```

#### **propertyService.ts** (UPDATED)
```typescript
- getPortfolioProperties(portfolioId)  // Get properties by portfolio
- getAllUserProperties()               // Get user's default portfolio properties
- createProperty(portfolioId, ...)     // Create in specific portfolio
```

### **🚧 In Progress:**

- tenantService.ts - Partially updated
- unitService.ts - Needs update
- leaseService.ts - Needs update
- maintenanceService.ts - Needs update
- expenseService.ts - Needs update
- paymentService.ts - Needs update

---

## UI Components Needed

### **🔴 Not Yet Built:**

1. **PortfolioContext Provider**
   - Manages current active portfolio
   - Provides portfolio switching
   - Handles default portfolio loading

2. **PortfolioSelector Dropdown**
   - Shows in header (if multi-portfolio)
   - Allows switching between portfolios
   - Only visible when user has 2+ portfolios

3. **Portfolio Upgrade Wizard**
   - Triggers when user tries to add 2nd portfolio
   - Explains new hierarchy
   - Handles migration automatically
   - Collects new portfolio name

4. **Client Management UI** (Management Company Tier)
   - List clients
   - Add/edit clients
   - View client portfolios
   - Switch between client views

5. **Updated Dashboard**
   - Show current portfolio name
   - Portfolio-specific stats
   - Portfolio selector (if applicable)

6. **Updated Pages:**
   - Properties - Filter by current portfolio
   - Tenants - Show portfolio tenants
   - Maintenance - Portfolio-scoped
   - Reports - Portfolio selection

---

## User Experience Flow

### **New User Signup:**
1. User creates account
2. System auto-creates default portfolio ("My Portfolio")
3. User sees simple "My Properties" interface
4. No mention of portfolios/organizations

### **Adding First Property:**
1. User clicks "Add Property"
2. Property added to default portfolio (transparent)
3. Everything just works

### **Upgrading to Multi-Portfolio:**
1. User clicks "Add Portfolio" (hidden in settings)
2. Wizard appears: "You're adding a 2nd portfolio!"
3. Explains organizations will be created
4. User names new portfolio
5. System:
   - Creates organization
   - Links existing portfolio to organization
   - Creates new portfolio
   - Switches UI to show portfolio selector

### **Management Company Onboarding:**
1. User signs up with Management Company tier
2. System prompts to create organization
3. User adds first client
4. Client gets auto-created portfolio
5. PM can now manage multiple clients

---

## Technical Implementation Status

### **Database: ✅ Complete**
- All tables created
- Indexes added
- RLS policies configured
- Helper functions working
- Auto-create portfolio on signup

### **Services: 🟡 50% Complete**
- ✅ portfolioService - Done
- ✅ propertyService - Updated for portfolios
- 🚧 tenantService - Partially updated
- ❌ Other services - Need updates

### **UI: 🔴 Not Started**
- ❌ PortfolioContext
- ❌ PortfolioSelector component
- ❌ Upgrade wizard
- ❌ Client management
- ❌ Updated pages

### **Build Status: ✅ Passing**
- Project builds successfully
- No TypeScript errors
- Backward compatible (for now)

---

## Migration Path

### **Phase 1: Backend (Current)**
- ✅ Database schema
- 🚧 Service layer updates
- ✅ Helper functions

### **Phase 2: Core UI (Next)**
- Create PortfolioContext
- Update Dashboard
- Add portfolio selector
- Update main pages (Properties, Tenants, etc.)

### **Phase 3: Advanced Features**
- Multi-portfolio upgrade wizard
- Client management (Management Company)
- Portfolio-specific settings
- Advanced reporting per portfolio

### **Phase 4: Polish**
- User documentation
- Admin tools
- Performance optimization
- Edge case handling

---

## Key Decisions Made

1. **Portfolio-First Design**
   - `portfolio_id` is primary reference
   - `organization_id` secondary (for multi-portfolio only)

2. **Transparent Complexity**
   - Single portfolio users never see "portfolio" term
   - Complexity revealed only when needed

3. **Auto-Migration**
   - System handles organization creation automatically
   - No manual data migration required

4. **Backward Compatible**
   - Existing code still works
   - Gradual migration to new architecture

5. **Client vs Property Owner**
   - "Clients" = Management Company's property owner customers
   - "Property Owners" = Individual properties' legal owners
   - Separate concepts, separate tables

---

## Next Steps

1. **Complete Service Layer Updates**
   - Update all services to use `portfolio_id`
   - Remove `organization_id` dependencies
   - Test all CRUD operations

2. **Create PortfolioContext**
   - Manage active portfolio state
   - Provide switching functionality
   - Load user's portfolios

3. **Build Core UI Components**
   - PortfolioSelector dropdown
   - Portfolio management page
   - Upgrade wizard

4. **Update All Pages**
   - Use PortfolioContext
   - Filter by active portfolio
   - Show portfolio name in headers

5. **Test Multi-Portfolio Flow**
   - Create 2nd portfolio
   - Verify organization creation
   - Test switching between portfolios

6. **Test Management Company Tier**
   - Add clients
   - Create client portfolios
   - Verify isolation between clients

---

## Breaking Changes (When Complete)

**Function Signatures Changed:**
```typescript
// OLD
propertyService.getAllProperties(organizationId)
tenantService.createTenant(organizationId, unitId, ...)

// NEW
propertyService.getPortfolioProperties(portfolioId)
tenantService.createTenant(portfolioId, unitId, ...)
```

**UI Props Changed:**
```typescript
// OLD
<Dashboard organizationId={orgId} />

// NEW
<Dashboard portfolioId={portfolioId} />
```

---

## Success Metrics

**V3.2.0 Complete When:**
- ✅ All services use `portfolio_id`
- ✅ Portfolio selector works
- ✅ Can create 2nd portfolio (triggers organization)
- ✅ Can switch between portfolios
- ✅ Management Company tier can manage clients
- ✅ All pages respect active portfolio
- ✅ Build passes
- ✅ No console errors

---

## Questions to Resolve

1. **UI Terminology:**
   - Call it "Portfolio" or "Business"?
   - Show term to single-portfolio users?

2. **Package Tiers:**
   - Which tiers get multi-portfolio?
   - Price for 2nd portfolio?

3. **Data Migration:**
   - How to handle existing production users?
   - Auto-migrate or manual?

4. **Performance:**
   - Index strategy for portfolio_id
   - Query optimization needed?

---

**This is the future of AI Rental Tools!** 🚀

Simple for beginners, powerful for pros, scalable for PM companies.

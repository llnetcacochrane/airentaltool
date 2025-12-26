# Registration Flows - AI Rental Tools v5.0.0

## Overview

Three distinct registration flows have been implemented based on user type and package tier. Each flow is optimized for mobile and uses the new FullPageWizard component.

## Flow Selection

Users are routed to the appropriate flow based on their package tier:

```typescript
// Type 1: Free/Basic tiers (max_businesses=1, max_properties≤10)
/register/single-landlord

// Type 2: Professional tiers (max_businesses≤1, max_properties>10)
/register/multi-property

// Type 3: Management tiers (max_businesses>1)
/register/property-manager
```

## Type 1: Single Landlord

**Target Users:** Individual landlords managing a single rental property
**Package Tiers:** Free, Basic

### Flow Steps:
1. **Personal & Property Information (Single Page)**
   - Personal details (name, email, password, phone)
   - Property/business name
   - Property address

### Key Features:
- Simplified single-page form
- Organization and business created automatically using same info
- Redirects to property setup wizard after registration
- Mobile-optimized form layout

### Registration Data:
```javascript
{
  firstName, lastName, email, password, phone,
  businessName, // Used for both org and business
  address // Shared by org and business
}
```

---

## Type 2: Multi-Property Landlord

**Target Users:** Landlords managing multiple properties
**Package Tiers:** Professional

### Flow Steps:
1. **Personal Information**
   - Name, email, password, phone

2. **Organization Setup**
   - Organization name
   - Organization address

3. **First Business**
   - Option: "Use same information as organization"
   - If different: Business name and address

4. **Business Partners (Optional)**
   - Add co-owners/partners
   - Each partner gets:
     - Personal information
     - Ownership percentage
     - Own login credentials

5. **Review & Confirm**
   - Summary of all information
   - Confirmation before submission

### Key Features:
- Full wizard with progress tracking
- Distinction between organization and business
- Partnership/co-owner support
- Each partner receives login credentials
- Redirects to property setup wizard

### Registration Data:
```javascript
{
  // Personal
  firstName, lastName, email, password, phone,

  // Organization
  organizationName, orgAddress,

  // Business
  useSameAsOrg: boolean,
  businessName, businessAddress,

  // Partners
  hasPartners: boolean,
  partners: [{
    firstName, lastName, email, phone,
    ownershipPercent
  }]
}
```

---

## Type 3: Property Management Company

**Target Users:** Property management companies managing multiple client businesses
**Package Tiers:** Management Starter, Growth, Professional, Enterprise

### Flow Steps:
1. **Personal Information**
   - PM company representative details
   - Name, email, password, phone

2. **Management Company Setup**
   - Company name and address
   - Separate from client businesses

3. **First Client Business (Optional)**
   - Option to add first client during registration
   - Client business name and address
   - Can also be done later from dashboard

4. **Business Owners**
   - Add property owners for the client business
   - Each owner receives:
     - Personal information
     - Ownership percentage
     - Access control (full/limited)
     - Own login credentials

5. **Review & Confirm**
   - Summary of company and client info
   - Confirmation before submission

### Key Features:
- Clear separation between PM company and client businesses
- Optional first client setup
- Business owner credential management
- Granular access control per owner
- Redirects to business setup wizard

### Registration Data:
```javascript
{
  // Personal (PM Rep)
  firstName, lastName, email, password, phone,

  // Management Company
  managementCompany: true,
  companyName, companyAddress,

  // Optional First Client
  setupFirstClient: boolean,
  clientBusiness: {
    name, address
  },

  // Business Owners
  businessOwners: [{
    firstName, lastName, email, phone,
    ownershipPercent,
    grantFullAccess: boolean
  }]
}
```

---

## Technical Implementation

### Components Used:
- **FullPageWizard** - Multi-step wizard container
  - Step navigation sidebar (desktop)
  - Progress bar
  - Mobile-optimized layout
  - Browser back button support

- **Mobile-First Design**
  - Responsive grid layouts
  - Touch-friendly inputs (min 44x44px)
  - Collapsible sections on mobile
  - Bottom-sheet style on small screens

### Validation:
- Client-side validation on each step
- Required field checking
- Password strength validation (min 6 chars)
- Password confirmation matching
- Phone number format validation
- Email format validation
- Postal code format validation

### Routes:
```typescript
// App.tsx
<Route path="/register/single-landlord" element={<RegisterType1 />} />
<Route path="/register/multi-property" element={<RegisterType2 />} />
<Route path="/register/property-manager" element={<RegisterType3 />} />
```

---

## Post-Registration Flows

### Type 1:
→ `/onboarding/property` - Property setup wizard

### Type 2:
→ `/onboarding/property` - Property setup wizard
→ Dashboard shows business setup option if needed

### Type 3:
→ `/onboarding/business` - Business setup wizard
→ Dashboard shows client management tools

---

## User Experience Features

### All Flows:
- ✅ Cancel button returns to landing page
- ✅ "Already have account?" link to login
- ✅ Real-time validation feedback
- ✅ Error messages displayed per-step
- ✅ Loading states during submission
- ✅ Mobile-optimized keyboard types (email, tel, number)

### Accessibility:
- Proper label associations
- Keyboard navigation support
- ARIA labels on interactive elements
- High contrast error states
- Touch-friendly tap targets

### Mobile Optimizations:
- Stacked layouts on small screens
- Bottom-fixed navigation on mobile
- Swipe gestures disabled (wizard controlled)
- Auto-capitalization for postal codes
- Phone number formatting as you type

---

## Future Enhancements

1. **Package tier selection** before registration
2. **Email verification** step
3. **Progressive data saving** (draft registration)
4. **Social login** integration (Google, Microsoft)
5. **Multi-language** support
6. **Wizard resumption** from saved state
7. **Video tutorials** embedded in wizard
8. **Live chat support** during registration

---

## Testing Checklist

- [ ] Type 1 flow on mobile (iOS/Android)
- [ ] Type 2 flow on tablet
- [ ] Type 3 flow on desktop
- [ ] Form validation on all steps
- [ ] Partner/owner addition and removal
- [ ] Address autocomplete (if implemented)
- [ ] Error handling and display
- [ ] Browser back button behavior
- [ ] Session timeout during registration
- [ ] Database record creation verification

---

## Database Schema Impact

### Tables Created/Updated:
- `auth.users` - User authentication
- `user_profiles` - User profile data
- `organizations` - Organization entities
- `businesses` - Business entities
- `property_owners` - Business owners/partners
- `business_owner_access` - Access control (Type 3)

### Relationships:
```
User (1) ─── (1) UserProfile
User (1) ─── (n) Organizations (via org members)
Organization (1) ─── (n) Businesses
Business (n) ─── (n) PropertyOwners
PropertyOwner (1) ─── (1) User (optional)
```

---

## Support Documentation

For implementation details, see:
- `/home/ubuntu/airentaltools-dev/V5_PROGRESS.md`
- `/home/ubuntu/airentaltools-dev/src/utils/packageTierHelpers.ts`
- Component documentation in respective files

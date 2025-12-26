# AI Rental Tools v5.0.0 - Comprehensive Test Plan

**Version:** 5.0.0
**Test Date:** 2024-12-15
**Environment:** Production (https://airentaltool.com)
**Tester:** _______________

---

## Test Execution Summary

| Feature Area | Tests | Passed | Failed | Blocked | Notes |
|--------------|-------|--------|--------|---------|-------|
| Data Export | 10 | | | | |
| Bulk Operations | 8 | | | | |
| Advanced Search/Filter | 6 | | | | |
| Email Verification | 5 | | | | |
| Analytics Tracking | 4 | | | | |
| Animations/Transitions | 6 | | | | |
| Performance | 4 | | | | |
| **TOTAL** | **43** | | | | |

---

## 1. Data Export Functionality

### 1.1 Properties Export
- [ ] **TEST-001:** Navigate to Properties page
- [ ] **TEST-002:** Click Export button (should show dropdown with 4 formats)
- [ ] **TEST-003:** Export as CSV - verify file downloads and contains property data
- [ ] **TEST-004:** Export as Excel CSV - verify UTF-8 BOM header, opens in Excel correctly
- [ ] **TEST-005:** Export as PDF - verify professional layout with columns and data
- [ ] **TEST-006:** Export as JSON - verify valid JSON structure
- [ ] **TEST-007:** Export button is disabled when no properties exist
- [ ] **Expected:** All formats download correctly with proper formatting

### 1.2 Tenants Export
- [ ] **TEST-008:** Navigate to Tenants page
- [ ] **TEST-009:** Export tenants as CSV - verify contact info, employment data included
- [ ] **TEST-010:** Export tenants as PDF - verify table layout and readability
- [ ] **Expected:** Tenant exports include all relevant fields (name, email, phone, employer, etc.)

### 1.3 Payments Export
- [ ] **TEST-011:** Navigate to Payments page
- [ ] **TEST-012:** Export payments as CSV - verify amounts formatted as currency
- [ ] **TEST-013:** Export payments as PDF - verify status icons and colors preserved
- [ ] **Expected:** Payment exports show reference numbers, amounts, dates, and status

### 1.4 Expenses Export
- [ ] **TEST-014:** Navigate to Expenses page
- [ ] **TEST-015:** Export expenses as CSV - verify vendor names and categories
- [ ] **TEST-016:** Export expenses as PDF - verify totals and categorization
- [ ] **Expected:** Expense exports include all transaction details

### 1.5 Maintenance Export
- [ ] **TEST-017:** Navigate to Maintenance page
- [ ] **TEST-018:** Export maintenance requests as CSV
- [ ] **TEST-019:** Export maintenance requests as PDF - verify priority and status visible
- [ ] **Expected:** Maintenance exports show request details, priority, and current status

---

## 2. Bulk Operations

### 2.1 Properties Bulk Selection
- [ ] **TEST-020:** Navigate to Properties page with multiple properties
- [ ] **TEST-021:** Click checkbox on first property card - verify selection state
- [ ] **TEST-022:** Click checkbox on second property - verify BulkActionBar appears at bottom
- [ ] **TEST-023:** Verify BulkActionBar shows "2 items selected"
- [ ] **TEST-024:** Click "Select all properties" - verify all properties selected
- [ ] **TEST-025:** Click "X" to clear selection - verify BulkActionBar disappears
- [ ] **Expected:** Selection state accurate, UI responds immediately

### 2.2 Properties Bulk Delete
- [ ] **TEST-026:** Select 2 properties using checkboxes
- [ ] **TEST-027:** Click "Delete" button on BulkActionBar
- [ ] **TEST-028:** Verify confirmation dialog appears with warning message
- [ ] **TEST-029:** Click "Cancel" - verify nothing deleted, selection remains
- [ ] **TEST-030:** Select properties again, click Delete, confirm - verify properties deleted
- [ ] **TEST-031:** Verify BulkActionBar disappears after deletion
- [ ] **Expected:** Bulk delete removes all selected properties, units, and tenants

### 2.3 Tenants Bulk Operations (Mobile View)
- [ ] **TEST-032:** Resize browser to mobile width (<768px)
- [ ] **TEST-033:** Verify checkboxes appear in top-left of tenant cards
- [ ] **TEST-034:** Select multiple tenant cards - verify BulkActionBar appears
- [ ] **Expected:** Mobile card view supports bulk selection

### 2.4 Tenants Bulk Operations (Desktop View)
- [ ] **TEST-035:** Expand browser to desktop width (>768px)
- [ ] **TEST-036:** Verify checkbox column in table header
- [ ] **TEST-037:** Click header checkbox - verify all tenants selected (indeterminate state)
- [ ] **TEST-038:** Uncheck some tenants - verify header checkbox shows indeterminate (dash)
- [ ] **TEST-039:** Bulk delete selected tenants - verify units marked as vacant
- [ ] **Expected:** Table header checkbox has 3 states: unchecked, indeterminate, checked

---

## 3. Advanced Search & Filtering

### 3.1 Payments Advanced Search
- [ ] **TEST-040:** Navigate to Payments page
- [ ] **TEST-041:** Type in search box - verify real-time filtering by reference number
- [ ] **TEST-042:** Click "Filters" button - verify filter panel slides down
- [ ] **TEST-043:** Select Status filter = "Completed" - verify only completed payments shown
- [ ] **TEST-044:** Add Date Range filter (last 30 days) - verify date filtering works
- [ ] **TEST-045:** Add Amount Range ($100-$500) - verify amount filtering
- [ ] **TEST-046:** Verify active filter count badge shows "3" on Filters button
- [ ] **TEST-047:** Click "Clear all" - verify all filters reset, all payments shown
- [ ] **Expected:** Filters combine correctly (AND logic), UI updates immediately

### 3.2 Filter Panel Behavior
- [ ] **TEST-048:** Open filter panel - verify smooth slide-down animation
- [ ] **TEST-049:** Close and reopen - verify previously selected filters persist
- [ ] **TEST-050:** Apply multiple filters - verify filter count badge updates
- [ ] **Expected:** Filter panel is collapsible, responsive, and retains state

---

## 4. Email Verification System

### 4.1 New User Registration
- [ ] **TEST-051:** Register a new user account
- [ ] **TEST-052:** Verify email sent to registered email address
- [ ] **TEST-053:** Check email contains verification link
- [ ] **TEST-054:** Click verification link - verify redirected to /verify-email
- [ ] **TEST-055:** Verify success message and auto-redirect countdown (5 seconds)
- [ ] **Expected:** Email arrives within 1 minute, link works, redirect happens

### 4.2 Email Verification Banner
- [ ] **TEST-056:** Login with unverified account
- [ ] **TEST-057:** Verify amber banner appears at top: "Please verify your email"
- [ ] **TEST-058:** Click "Resend verification email" - verify success message
- [ ] **TEST-059:** Check email received
- [ ] **TEST-060:** Click "Dismiss" on banner - verify banner disappears
- [ ] **Expected:** Banner only shows for unverified users, dismissible

### 4.3 Verified User Experience
- [ ] **TEST-061:** Login with verified account
- [ ] **TEST-062:** Verify NO verification banner appears
- [ ] **Expected:** Verified users don't see verification prompts

---

## 5. Analytics Tracking

### 5.1 Page Tracking
- [ ] **TEST-063:** Open browser DevTools Console
- [ ] **TEST-064:** Navigate to Dashboard - check console for analytics event
- [ ] **TEST-065:** Navigate to Properties - verify page view tracked
- [ ] **TEST-066:** Verify localStorage has analytics data (key: 'analytics_events')
- [ ] **Expected:** Each page navigation logs analytics event

### 5.2 Privacy Features
- [ ] **TEST-067:** Enable browser "Do Not Track" setting
- [ ] **TEST-068:** Navigate around app - verify NO analytics events logged
- [ ] **TEST-069:** Verify console shows "Analytics disabled (DNT enabled)"
- [ ] **Expected:** DNT setting respected, no tracking when enabled

### 5.3 Form Tracking
- [ ] **TEST-070:** Start filling out Add Property form
- [ ] **TEST-071:** Check console for "form_started" event
- [ ] **TEST-072:** Submit form - verify "form_submitted" event with success flag
- [ ] **Expected:** Form interactions tracked without capturing sensitive data

---

## 6. Animations & Transitions

### 6.1 Page Transitions
- [ ] **TEST-073:** Navigate between pages - verify smooth fade transitions
- [ ] **TEST-074:** Verify no janky/choppy animations (60 FPS)
- [ ] **Expected:** Smooth, professional page transitions

### 6.2 Toast Notifications
- [ ] **TEST-075:** Trigger a toast (e.g., save property)
- [ ] **TEST-076:** Verify toast slides in from right with scale animation
- [ ] **TEST-077:** Verify toast auto-dismisses after 5 seconds
- [ ] **TEST-078:** Verify toast slides out smoothly
- [ ] **Expected:** Toast animations feel polished and natural

### 6.3 Modal/SlidePanel Animations
- [ ] **TEST-079:** Open Add Property form (SlidePanel)
- [ ] **TEST-080:** Verify panel slides in from right, backdrop fades in
- [ ] **TEST-081:** Close panel - verify slide-out and backdrop fade-out
- [ ] **Expected:** Modal open/close animations are smooth

### 6.4 Accessibility (Reduced Motion)
- [ ] **TEST-082:** Enable OS "Reduce Motion" setting
- [ ] **TEST-083:** Navigate app - verify animations still work but are instant/minimal
- [ ] **Expected:** Respects user's motion preferences

---

## 7. Performance Optimizations

### 7.1 Initial Load Performance
- [ ] **TEST-084:** Clear browser cache completely
- [ ] **TEST-085:** Load homepage - measure time to interactive (<3 seconds)
- [ ] **TEST-086:** Check Network tab - verify code splitting (multiple small bundles)
- [ ] **TEST-087:** Verify largest bundle <500KB (gzipped)
- [ ] **Expected:** Fast initial load, efficient code splitting

### 7.2 Page Navigation Performance
- [ ] **TEST-088:** Navigate to Properties page - verify lazy loading
- [ ] **TEST-089:** Navigate to Reports page - verify chunk loads on-demand
- [ ] **TEST-090:** Return to previously visited page - verify instant load (cached)
- [ ] **Expected:** Each page loads quickly, no full page reloads

### 7.3 Large Dataset Performance
- [ ] **TEST-091:** Load Properties page with 50+ properties
- [ ] **TEST-092:** Verify smooth scrolling, no lag
- [ ] **TEST-093:** Select all properties via bulk select - verify fast response
- [ ] **Expected:** App remains responsive with large datasets

---

## 8. Database Performance (Indexes)

### 8.1 Query Performance
- [ ] **TEST-094:** Load Payments page - verify load time <1 second
- [ ] **TEST-095:** Filter payments by date range - verify instant filtering
- [ ] **TEST-096:** Load Properties page with units - verify efficient joins
- [ ] **Expected:** All queries return in under 1 second

---

## 9. Cross-Browser Testing

### 9.1 Chrome/Edge
- [ ] **TEST-097:** Test all features in Chrome - document any issues
- [ ] **Expected:** 100% functionality works

### 9.2 Firefox
- [ ] **TEST-098:** Test all features in Firefox - document any issues
- [ ] **Expected:** 100% functionality works

### 9.3 Safari
- [ ] **TEST-099:** Test all features in Safari - document any issues
- [ ] **Expected:** 100% functionality works (may have minor CSS differences)

---

## 10. Mobile Responsiveness

### 10.1 Mobile Layout (320px-767px)
- [ ] **TEST-100:** Resize to 375px width (iPhone)
- [ ] **TEST-101:** Verify Properties cards stack vertically
- [ ] **TEST-102:** Verify Export button doesn't overflow
- [ ] **TEST-103:** Verify BulkActionBar adapts to mobile width
- [ ] **TEST-104:** Verify all forms are scrollable and usable
- [ ] **Expected:** Full functionality on mobile devices

### 10.2 Tablet Layout (768px-1023px)
- [ ] **TEST-105:** Resize to 768px width (iPad)
- [ ] **TEST-106:** Verify 2-column grid for Properties
- [ ] **TEST-107:** Verify table views switch to desktop mode
- [ ] **Expected:** Optimal layout for tablet screens

---

## 11. Error Handling

### 11.1 Network Errors
- [ ] **TEST-108:** Disconnect internet, try to load data
- [ ] **TEST-109:** Verify error message displays clearly
- [ ] **TEST-110:** Reconnect internet, verify retry works
- [ ] **Expected:** Graceful error handling, clear user feedback

### 11.2 Form Validation
- [ ] **TEST-111:** Submit empty Add Property form
- [ ] **TEST-112:** Verify validation errors highlight required fields
- [ ] **TEST-113:** Fix errors, resubmit - verify form submits successfully
- [ ] **Expected:** Clear validation feedback, prevents bad data

---

## 12. Security Testing

### 12.1 Authentication
- [ ] **TEST-114:** Logout, try to access /properties directly
- [ ] **TEST-115:** Verify redirect to login page
- [ ] **TEST-116:** Login - verify redirect back to /properties
- [ ] **Expected:** Protected routes require authentication

### 12.2 Authorization
- [ ] **TEST-117:** Login as regular user, try to access /admin
- [ ] **TEST-118:** Verify access denied or redirect
- [ ] **Expected:** Role-based access control works

---

## Critical Issues Log

| Issue ID | Severity | Description | Steps to Reproduce | Status |
|----------|----------|-------------|-------------------|--------|
| | | | | |
| | | | | |

**Severity Levels:**
- **Critical:** App crash, data loss, security vulnerability
- **High:** Major feature broken, severe UX issue
- **Medium:** Minor feature broken, workaround available
- **Low:** Cosmetic issue, minor inconvenience

---

## Test Environment Details

**Browser:** _______________
**OS:** _______________
**Screen Resolution:** _______________
**Network Speed:** _______________

---

## Sign-Off

**Tester Name:** _______________
**Date:** _______________
**Signature:** _______________

**Overall Assessment:**
- [ ] **PASS** - Ready for production
- [ ] **PASS with Minor Issues** - Deploy with known issues documented
- [ ] **FAIL** - Critical issues must be fixed before deployment

**Comments:**
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

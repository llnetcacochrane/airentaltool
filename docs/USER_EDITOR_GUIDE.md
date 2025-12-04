# Comprehensive User Editor Guide

## Overview

The User Editor provides Super Admins with full granular control over all user data, permissions, package tiers, and features. This is a complete management interface for user administration.

## Features

### 1. Profile Management

**Edit User Information:**
- Email address (with secure update flow)
- First and last name
- Phone number
- Complete address (address, city, state/province, postal code, country)
- Account creation date (read-only)
- Super Admin status toggle

**Capabilities:**
- Update any profile field
- Change user email (requires re-verification)
- Grant or revoke Super Admin privileges
- View account creation date

### 2. Organization Management

**Organization Memberships:**
- View all organizations the user belongs to
- Add user to new organizations
- Remove user from organizations
- Update user's role in each organization
- View organization package tier

**Roles Available:**
- Member
- Property Manager
- Accounting
- Admin
- Owner

**Actions:**
- Add to Organization: Assign user to any organization with a specific role
- Remove from Organization: Remove user membership (with confirmation)
- Change Role: Update user's role within an organization
- View Status: See active/inactive membership status

### 3. Package & Tier Management

**User-Level Package:**
- Set the user's selected tier (shown during onboarding)
- Choose from all available package tiers:
  - Free
  - Landlord/Basic
  - Professional
  - Management Company

**Organization-Level Packages:**
- View current package for each organization
- Change package tier for any organization
- Affects features and limits for the entire organization

**Package Tiers Include:**
- Free: 5 units max, basic features
- Landlord: Unlimited properties, 1 business entity
- Professional: Multiple businesses, AI features
- Management: Full features, white-label, API access

### 4. Feature Flags Management

**Granular Feature Control:**
Super Admins can enable/disable specific features for organizations:

- **Business Entities**: Organize properties under businesses
- **Property Owners**: Manage property owner accounts
- **AI Recommendations**: AI-powered insights and suggestions
- **Rent Optimization**: Market-based rent recommendations
- **White Label Branding**: Custom branding for management companies
- **API Access**: Programmatic access to the platform
- **Custom Reports**: Advanced reporting capabilities
- **Bulk Operations**: Mass updates and imports

**How It Works:**
1. Select an organization from the dropdown
2. View all available features with current status
3. Enable or disable features individually
4. Changes take effect immediately

### 5. Business Management

**View User Businesses:**
- See all businesses created by the user
- Business name and type
- Active/Inactive status
- Direct link to view/edit business details

**Information Displayed:**
- Business name
- Business type (LLC, Corporation, etc.)
- Active status
- Quick link to business detail page

## How to Access

### For Super Admins:
1. Navigate to **Super Admin Dashboard**
2. Click **User Management**
3. Find the user you want to edit
4. Click the **Edit** button next to their name

### User Editor Interface:

The editor opens as a full-screen modal with 5 tabs:

1. **Profile** - Personal information and contact details
2. **Organizations** - Memberships and roles
3. **Package & Tier** - Package management
4. **Features** - Feature flags and permissions
5. **Businesses** - Business entities

## Common Use Cases

### 1. Onboarding a New Client

**Scenario:** A new property management company signs up.

**Steps:**
1. Create the user with "Create New User" button
2. Create a new organization for them
3. Set their package tier (e.g., "Management Company")
4. Enable relevant features (White Label, API Access)
5. Add the user to their organization as "Owner"

### 2. Upgrading a User's Package

**Scenario:** User wants to upgrade from Free to Landlord tier.

**Steps:**
1. Find the user in User Management
2. Click **Edit**
3. Go to **Package & Tier** tab
4. Select "Landlord" tier for their organization
5. Save changes
6. User now has unlimited properties and business entity access

### 3. Managing Team Members

**Scenario:** Add multiple team members to an organization.

**Steps:**
1. Create each user account
2. Edit each user
3. Go to **Organizations** tab
4. Click "Add to Organization"
5. Select the organization
6. Choose appropriate role (Admin, Property Manager, etc.)

### 4. Troubleshooting Access Issues

**Scenario:** User can't access certain features.

**Steps:**
1. Edit the user
2. Check **Organizations** tab - verify membership
3. Check **Package & Tier** tab - verify correct tier
4. Check **Features** tab - ensure feature is enabled
5. Update as needed

### 5. Granting Super Admin Access

**Scenario:** Make a trusted user a Super Admin.

**Steps:**
1. Edit the user
2. Go to **Profile** tab
3. Find "Super Admin Access" section
4. Click "Grant Access"
5. Confirm the action

## Security Features

### Confirmations Required:
- Email changes
- Super Admin access changes
- Removing users from organizations
- Deleting users

### Audit Trail:
- All changes are logged
- User ID displayed in footer
- Created date is preserved
- Cannot delete own account

### Data Protection:
- Email verification required for email changes
- Super Admin status changes require confirmation
- Organization removals are protected
- Profile updates are validated

## Best Practices

### 1. Regular Audits
- Review user permissions quarterly
- Check inactive organization memberships
- Verify package tiers match subscriptions

### 2. Role Assignment
- Use least privilege principle
- Only grant "Owner" role when necessary
- Use "Member" for basic access
- "Admin" for management tasks

### 3. Feature Management
- Enable only needed features
- Review feature usage before enabling expensive features
- Document why specific features are enabled

### 4. Package Management
- Ensure package tier matches billing
- Update tier immediately after subscription changes
- Communicate tier changes to users

## Technical Details

### Data Sources:
- **user_profiles**: User personal information
- **auth.users**: Authentication data (email)
- **super_admins**: Super admin status
- **organization_members**: Organization memberships
- **organizations**: Organization details
- **package_tiers**: Available package tiers
- **organization_feature_flags**: Feature permissions
- **businesses**: Business entities

### Permissions Required:
- Must be active Super Admin
- Super admin status verified on load
- All operations use admin RPC functions

### Real-time Updates:
- Changes save immediately
- Success/error messages displayed
- Data reloaded after changes
- No page refresh required

## Troubleshooting

### User Editor Won't Open
- Verify you're a Super Admin
- Check browser console for errors
- Ensure user ID is valid

### Changes Not Saving
- Check error messages
- Verify all required fields filled
- Check database permissions
- Review browser console

### Features Not Applying
- Ensure organization is selected
- Check if user is member of organization
- Verify package tier supports feature
- Allow time for cache refresh

## Support

For issues with the User Editor:
1. Check error messages in the editor
2. Review browser console logs
3. Verify database connectivity
4. Check super admin permissions
5. Contact system administrator

## Future Enhancements

Planned features:
- Bulk user operations
- User activity logs
- Permission templates
- Custom role creation
- Advanced search and filters
- Export user data
- Impersonation mode for debugging

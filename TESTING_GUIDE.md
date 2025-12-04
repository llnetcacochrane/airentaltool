# Testing Guide - Onboarding & Auto Business Creation

## Step 1: Apply Database Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Migration**
   - Open the file: `/migration_to_run.sql`
   - Copy all the SQL
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Should see: "Success. No rows returned"

3. **Create Business for Your Super Admin Account**
   Run this query (while logged in as your super admin):
   ```sql
   SELECT create_default_business_for_user(auth.uid());
   ```

   Or if you know your user_id:
   ```sql
   SELECT create_default_business_for_user('your-user-id-here');
   ```

## Step 2: Test Welcome Page Flow

### As Super Admin (Existing User):

1. **Check if You Have a Business**
   - Log in to the app
   - Go to `/businesses`
   - You should see a business (e.g., "Your Name Properties")

2. **Test Welcome Page Redirect**
   - If you have NO properties/units, you'll be redirected to `/welcome` from dashboard
   - Welcome page should show:
     - ✓ Business Profile (complete)
     - → Add Your First Property (button)
     - → Create Rental Units (locked)
     - → Add Your Tenants (locked)

3. **Add a Property**
   - Click "Add First Property" button
   - Should go to `/properties?new=true`
   - Fill out property form (address, etc.)
   - Save the property

4. **Check Welcome Page Updates**
   - Go back to `/welcome`
   - Should now show:
     - ✓ Business Profile (complete)
     - ✓ Add Your First Property (complete)
     - → Create Rental Units (button now available)
     - → Add Your Tenants (locked)

5. **Add Units**
   - Click "Add Units" button
   - Create at least one unit for your property
   - Save

6. **Check Welcome Page Again**
   - Go to `/welcome`
   - Should show:
     - ✓ Business Profile (complete)
     - ✓ Property (complete)
     - ✓ Units (complete)
     - → Add Your Tenants (button now available)

7. **Add Tenant**
   - Click "Add Tenant" button
   - Fill out tenant form
   - Assign to unit
   - Save

8. **Complete!**
   - Go to `/welcome`
   - Should show success screen
   - "You're All Set!" with celebration
   - Button to go to dashboard

9. **Dashboard Access**
   - Go to `/dashboard`
   - Should stay on dashboard (no redirect)
   - Dashboard shows your data

### Test New User Signup Flow:

1. **Create New Account**
   - Log out of super admin
   - Go to `/register`
   - Enter: First Name, Last Name, Email, Password
   - Select package tier (try "Free")
   - Sign up

2. **Automatic Setup**
   - After signup, should be redirected to `/welcome`
   - Welcome page should show:
     - ✓ Business Profile: "FirstName LastName Properties" (auto-created!)
     - Package tier info with features
     - Checklist with next steps

3. **Follow Onboarding**
   - Click "Add First Property"
   - Complete property form
   - Add units
   - Add tenant
   - See completion screen

## Step 3: Verify Feature Flags

1. **Check Portfolio Features**
   - Log in as super admin
   - Go to `/super-admin/users`
   - Edit the test user you created
   - Go to "Features" tab
   - Should see features based on package tier:
     - Free: Basic features only
     - Landlord: + Unlimited units, businesses
     - Professional: + AI features
     - Enterprise: + White label, API

2. **Test Package Upgrade**
   - In User Editor, change user's package tier
   - Save
   - Features should auto-update
   - User should see new features

## Expected Results Checklist

✓ Migration runs without errors
✓ Super admin gets auto-created business
✓ New users get auto-created business with correct name
✓ Welcome page shows onboarding checklist
✓ Package tier information displays correctly
✓ Checklist items unlock as user progresses
✓ Dashboard redirects new users to welcome
✓ Dashboard doesn't redirect users who completed onboarding
✓ Properties link to business correctly
✓ Units link to properties correctly
✓ Tenants link to units correctly
✓ Features sync with package tier
✓ User Editor shows features at portfolio level

## Common Issues & Solutions

### Issue: "Failed to load user data" in User Editor
**Solution**: User might not have a portfolio. Check:
```sql
SELECT * FROM portfolios WHERE user_id = 'user-id-here';
```
If no portfolio, create one:
```sql
INSERT INTO portfolios (user_id, name, is_default)
VALUES ('user-id-here', 'Default Portfolio', true);
```

### Issue: User not redirected to welcome
**Solution**: They might have properties already. Check onboarding status:
```sql
SELECT user_has_completed_onboarding('user-id-here');
```

### Issue: Business not auto-created
**Solution**: Trigger might not have fired. Manually create:
```sql
SELECT create_default_business_for_user('user-id-here');
```

### Issue: Features not showing
**Solution**: Sync features for user's portfolio:
```sql
SELECT sync_portfolio_features_from_tier(id)
FROM portfolios
WHERE user_id = 'user-id-here';
```

## Database Verification Queries

**Check user has business:**
```sql
SELECT b.* FROM businesses b
JOIN user_profiles up ON b.created_by = up.user_id
WHERE up.user_id = auth.uid();
```

**Check onboarding status:**
```sql
SELECT user_has_completed_onboarding();
```

**Check portfolio features:**
```sql
SELECT * FROM portfolio_feature_flags
WHERE portfolio_id IN (
  SELECT id FROM portfolios WHERE user_id = auth.uid()
);
```

**Check business hierarchy:**
```sql
SELECT
  b.business_name,
  COUNT(DISTINCT p.id) as properties,
  COUNT(DISTINCT u.id) as units,
  COUNT(DISTINCT t.id) as tenants
FROM businesses b
LEFT JOIN properties p ON p.business_id = b.id
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN tenants t ON t.unit_id = u.id
WHERE b.created_by = auth.uid()
GROUP BY b.id, b.business_name;
```

## What to Look For During Testing

1. **Smooth Flow**: User should never be confused about next steps
2. **Clear Progress**: Checklist should clearly show what's done
3. **Action Buttons**: Buttons should only appear when they make sense
4. **Auto-Creation**: Business creation should be invisible to user
5. **Package Display**: User should understand what they're getting
6. **Feature Access**: Features should match what package includes
7. **No Errors**: Console should be clean (no red errors)
8. **Fast Loading**: Pages should load quickly
9. **Proper Routing**: Redirects should happen at right times
10. **Data Integrity**: Business → Property → Unit → Tenant hierarchy maintained

## Success Criteria

- ✅ New users can sign up and immediately see welcome page
- ✅ Business is auto-created with sensible name
- ✅ Onboarding checklist guides user through setup
- ✅ Features are based on package tier
- ✅ Super admin can manage features at portfolio level
- ✅ Dashboard works correctly for both new and existing users
- ✅ All CRUD operations work (create property, unit, tenant)
- ✅ No data loss or corruption
- ✅ RLS policies prevent unauthorized access
- ✅ User can complete entire flow without errors

## Post-Testing

After successful testing:
1. Document any issues found
2. Verify all users can access their data
3. Check that RLS policies are working
4. Confirm no performance issues
5. Ready for production use!

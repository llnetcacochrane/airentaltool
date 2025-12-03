# Super Admin Quick Setup Guide

## 🚀 Make Yourself Super Admin (5 Minutes)

### Step 1: Register Your Account
1. Go to your RentTrack app
2. Click "Register"
3. Create account with your email
4. Complete onboarding

### Step 2: Grant Yourself Super Admin Access
1. Open Supabase Dashboard
2. Go to "SQL Editor"
3. Run this query (replace with YOUR email):

```sql
-- Make yourself a Super Admin with full access
INSERT INTO super_admins (user_id, admin_type, is_active, notes)
SELECT
  id,
  'both',  -- System + SaaS Admin (full access)
  true,
  'Platform Owner - Initial Setup'
FROM auth.users
WHERE email = 'YOUR-EMAIL@example.com';  -- ⚠️ CHANGE THIS!
```

### Step 3: Verify Access
1. Log out of RentTrack
2. Log back in
3. Look for "Super Admin" link in navigation
4. Click it - you should see the Super Admin Dashboard!

---

## ✅ What You Should See

### Super Admin Dashboard:
- Purple badge: "System + SaaS Admin"
- Platform statistics (organizations, properties, tenants)
- Table of all organizations
- "System Config" button (top right)
- "Switch to Admin Org" button (top right)

---

**Ready to launch! 🚀**

See ADMIN_HIERARCHY_GUIDE.md for complete documentation.

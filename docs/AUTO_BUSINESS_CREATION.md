# Auto Business Creation on Signup

## Overview

Every new user now gets a default business automatically created when they sign up. This ensures the property hierarchy works correctly:

```
User → Business → Properties → Units → Tenants
```

## Migration Required

Due to database connection timeouts, the migration needs to be applied manually. Save the following as a migration file:

### Migration File: `063_auto_create_business_on_signup.sql`

```sql
/*
  # Auto-Create Business on User Signup

  Every user needs a business to organize their properties. This migration ensures
  a default business is automatically created when a user signs up.
*/

-- Function to create default business for user
CREATE OR REPLACE FUNCTION create_default_business_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_user_email text;
  v_first_name text;
  v_last_name text;
  v_business_name text;
BEGIN
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  SELECT first_name, last_name INTO v_first_name, v_last_name
  FROM user_profiles
  WHERE user_id = p_user_id;

  IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL THEN
    v_business_name := v_first_name || ' ' || v_last_name || ' Properties';
  ELSIF v_first_name IS NOT NULL THEN
    v_business_name := v_first_name || '''s Properties';
  ELSE
    v_business_name := split_part(v_user_email, '@', 1) || ' Properties';
  END IF;

  INSERT INTO businesses (
    organization_id,
    business_name,
    legal_name,
    business_type,
    email,
    is_active,
    created_by
  )
  VALUES (
    NULL,
    v_business_name,
    v_business_name,
    'Individual Landlord',
    v_user_email,
    true,
    p_user_id
  )
  RETURNING id INTO v_business_id;

  RETURN v_business_id;
END;
$$;

-- Trigger function to auto-create business on profile creation
CREATE OR REPLACE FUNCTION trigger_create_default_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_default_business_for_user(NEW.user_id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_user_profile_created_create_business ON user_profiles;
CREATE TRIGGER on_user_profile_created_create_business
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_business();

-- Function to check onboarding status
CREATE OR REPLACE FUNCTION user_has_completed_onboarding(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_business_count integer;
  v_property_count integer;
  v_unit_count integer;
  v_tenant_count integer;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT COUNT(*) INTO v_business_count
  FROM businesses
  WHERE created_by = v_user_id AND is_active = true;

  SELECT COUNT(*) INTO v_property_count
  FROM properties
  WHERE created_by = v_user_id AND is_active = true;

  SELECT COUNT(*) INTO v_unit_count
  FROM units
  WHERE created_by = v_user_id AND is_active = true;

  SELECT COUNT(*) INTO v_tenant_count
  FROM tenants t
  WHERE EXISTS (
    SELECT 1 FROM units u
    WHERE u.id = t.unit_id AND u.created_by = v_user_id
  );

  RETURN jsonb_build_object(
    'has_business', v_business_count > 0,
    'has_property', v_property_count > 0,
    'has_unit', v_unit_count > 0,
    'has_tenant', v_tenant_count > 0,
    'business_count', v_business_count,
    'property_count', v_property_count,
    'unit_count', v_unit_count,
    'tenant_count', v_tenant_count,
    'is_complete', v_business_count > 0 AND v_property_count > 0 AND v_unit_count > 0,
    'next_step', CASE
      WHEN v_business_count = 0 THEN 'create_business'
      WHEN v_property_count = 0 THEN 'create_property'
      WHEN v_unit_count = 0 THEN 'create_unit'
      WHEN v_tenant_count = 0 THEN 'create_tenant'
      ELSE 'complete'
    END
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION user_has_completed_onboarding(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_business_for_user(uuid) TO authenticated;
```

### To Create Businesses for Existing Users

Run this SQL separately in a SQL editor (not as a migration):

```sql
DO $$
DECLARE
  v_user record;
  v_business_id uuid;
BEGIN
  FOR v_user IN
    SELECT up.user_id, up.first_name, up.last_name
    FROM user_profiles up
    WHERE NOT EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.created_by = up.user_id
    )
  LOOP
    BEGIN
      SELECT create_default_business_for_user(v_user.user_id) INTO v_business_id;
      RAISE NOTICE 'Created business % for user %', v_business_id, v_user.user_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create business for user %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;
END $$;
```

## New User Flow

1. **User Signs Up**
   - Enters email, password, name
   - Selects package tier
   - Creates account

2. **Automatic Setup (Triggered)**
   - User profile created
   - Default portfolio created (existing)
   - **NEW: Default business created** → `[First] [Last] Properties`
   - Portfolio features synced from package tier (existing)

3. **Welcome Page**
   - User redirected to `/welcome`
   - Shows onboarding checklist:
     - ✓ Business Profile (auto-created)
     - → Add Your First Property
     - → Create Rental Units
     - → Add Your Tenants
   - Displays package tier and features
   - Provides action buttons for next steps

4. **Guided Setup**
   - Click "Add First Property" → Property creation wizard
   - Property wizard offers to create units
   - Once property and unit exist → Prompt to add tenants
   - After tenants added → Complete! Go to dashboard

## Welcome Page Features

### Dynamic Onboarding Status
- Checks what user has completed
- Shows next logical step
- Provides direct action buttons

### Package Information Display
- Shows user's current tier (Free, Landlord, Professional, Enterprise)
- Lists all included features
- Link to upgrade if on Free tier

### Step-by-Step Checklist
- ✓ Business Profile (auto-created)
- Add Your First Property (with action button)
- Create Rental Units (with action button)
- Add Your Tenants (with action button)

### Smart Routing
- Dashboard redirects new users to `/welcome`
- Welcome page redirects completed users to `/dashboard`
- Each action button goes to the right place with context

## Business Naming Logic

The auto-created business name follows this priority:

1. **If first and last name exist**: `John Smith Properties`
2. **If only first name exists**: `John's Properties`
3. **If no name**: `username Properties` (from email)

Users can rename their business anytime in the Business section.

## Benefits

1. **Simplified Onboarding**: No complex business creation forms
2. **Correct Hierarchy**: Business → Properties → Units → Tenants
3. **Guided Experience**: Users know exactly what to do next
4. **Flexible**: Users can rename/customize business later
5. **Works for All Tiers**: Free users get one business, higher tiers can add more

## Property Hierarchy Reminder

```
User
├── Portfolio (auto-created, container for properties)
├── Business (auto-created, for tax organization)
    ├── Property (user adds)
        ├── Unit (user adds)
            └── Tenant (user adds)
```

## Testing

1. **New User Signup:**
   - Sign up with full name
   - Verify redirected to `/welcome`
   - Check business was created with correct name
   - Verify checklist shows business as complete

2. **Property Addition:**
   - Click "Add First Property" on welcome page
   - Complete property form
   - Verify redirected back or prompted for units

3. **Unit Creation:**
   - Add units to property
   - Verify welcome page updates

4. **Tenant Addition:**
   - Add tenant to unit
   - Verify onboarding marked as complete
   - Verify redirected to dashboard

5. **Existing Users:**
   - Run backfill script
   - Verify all users now have a business
   - Check business names are correct

## Future Enhancements

1. **Business Name Customization**: Let users customize name during welcome
2. **Multi-Business Setup**: Guide professional tier users to add multiple businesses
3. **Property Import**: Bulk import properties during onboarding
4. **Template Properties**: Quick-start with common property types
5. **Progress Persistence**: Save onboarding progress to resume later

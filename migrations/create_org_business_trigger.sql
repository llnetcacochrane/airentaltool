-- Migration: Create SECURITY DEFINER trigger for automatic org/business creation on user signup
-- This bypasses RLS policies since signUp() doesn't establish a session before email confirmation

-- Drop existing triggers and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_setup_org ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_setup_org_z ON auth.users;
DROP FUNCTION IF EXISTS public.setup_user_organization_and_business() CASCADE;

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.setup_user_organization_and_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_business_id uuid;
  v_org_name text;
  v_first_name text;
  v_last_name text;
  v_slug text;
  v_registration_type text;
BEGIN
  -- Extract metadata from the new user
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_registration_type := COALESCE(NEW.raw_user_meta_data->>'registration_type', 'type1');

  -- Determine organization name based on registration type
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'business_name',
    NULLIF(TRIM(CONCAT(v_first_name, ' ', v_last_name)), ''),
    'My Organization'
  );

  -- Generate a unique slug
  v_slug := LOWER(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := TRIM(BOTH '-' FROM v_slug);
  v_slug := v_slug || '-' || SUBSTRING(NEW.id::text, 1, 8);

  -- Create organization
  INSERT INTO organizations (
    owner_id,
    name,
    slug,
    company_name,
    email,
    phone,
    account_tier,
    currency,
    timezone,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_org_name,
    v_slug,
    v_org_name,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'free',
    COALESCE(NEW.raw_user_meta_data->>'currency', 'CAD'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/Toronto'),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_org_id;

  -- Add user as organization owner
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    is_active,
    joined_at
  ) VALUES (
    v_org_id,
    NEW.id,
    'owner',
    true,
    NOW()
  );

  -- Create default business using organization info (for landlord types)
  -- Property managers (type3) might have different logic but we create a default anyway
  INSERT INTO businesses (
    organization_id,
    owner_user_id,
    business_name,
    legal_name,
    email,
    phone,
    address_line1,
    city,
    state,
    postal_code,
    country,
    currency,
    timezone,
    is_active,
    is_default,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_org_id,
    NEW.id,
    v_org_name,
    v_org_name,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address_line1',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'postal_code',
    COALESCE(NEW.raw_user_meta_data->>'country', 'Canada'),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'CAD'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/Toronto'),
    true,
    true,
    NEW.id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_business_id;

  RAISE NOTICE 'Created org % and business % for user %', v_org_id, v_business_id, NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Failed to setup org/business for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Create trigger - runs AFTER the user is created (and after create_user_profile trigger)
-- Using a name that sorts after 'on_auth_user_created' to ensure profile is created first
CREATE TRIGGER on_auth_user_setup_org_z
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION setup_user_organization_and_business();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.setup_user_organization_and_business() TO service_role;
GRANT EXECUTE ON FUNCTION public.setup_user_organization_and_business() TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

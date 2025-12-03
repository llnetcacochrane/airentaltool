-- Seed Test Data for system@airentaltool.com
-- Run this AFTER registering the account through the application
-- This will populate the account with 2 years of historical data

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_business1_id uuid;
  v_business2_id uuid;
  v_property1_id uuid;
  v_property2_id uuid;
  v_property3_id uuid;
  v_unit1_id uuid;
  v_unit2_id uuid;
  v_unit3_id uuid;
  v_unit4_id uuid;
  v_unit5_id uuid;
  v_unit6_id uuid;
  v_tenant1_id uuid;
  v_tenant2_id uuid;
  v_tenant3_id uuid;
  v_tenant4_id uuid;
  v_tenant5_id uuid;
  v_lease1_id uuid;
  v_lease2_id uuid;
  v_lease3_id uuid;
  v_lease4_id uuid;
  v_lease5_id uuid;
  payment_date date;
  months_back int;
BEGIN
  -- Get the user ID for system@airentaltool.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'system@airentaltool.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User system@airentaltool.com not found. Please register first.';
  END IF;

  -- Generate UUIDs
  v_org_id := gen_random_uuid();
  v_business1_id := gen_random_uuid();
  v_business2_id := gen_random_uuid();
  v_property1_id := gen_random_uuid();
  v_property2_id := gen_random_uuid();
  v_property3_id := gen_random_uuid();
  v_unit1_id := gen_random_uuid();
  v_unit2_id := gen_random_uuid();
  v_unit3_id := gen_random_uuid();
  v_unit4_id := gen_random_uuid();
  v_unit5_id := gen_random_uuid();
  v_unit6_id := gen_random_uuid();
  v_tenant1_id := gen_random_uuid();
  v_tenant2_id := gen_random_uuid();
  v_tenant3_id := gen_random_uuid();
  v_tenant4_id := gen_random_uuid();
  v_tenant5_id := gen_random_uuid();
  v_lease1_id := gen_random_uuid();
  v_lease2_id := gen_random_uuid();
  v_lease3_id := gen_random_uuid();
  v_lease4_id := gen_random_uuid();
  v_lease5_id := gen_random_uuid();

  -- Update user profile
  UPDATE user_profiles
  SET first_name = 'Test',
      last_name = 'Admin',
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Create organization
  INSERT INTO organizations (id, name, company_name, account_tier, created_at)
  VALUES (v_org_id, 'Demo Property Management', 'Demo PM LLC', 'growth', now() - interval '2 years');

  -- Update organization membership
  UPDATE organization_members
  SET role = 'owner'
  WHERE user_id = v_user_id;

  -- Create Business 1: Downtown Properties
  INSERT INTO businesses (
    id, organization_id, business_name, business_type,
    address_line1, city, state, postal_code, country,
    phone, email, is_active, created_at
  )
  VALUES (
    v_business1_id, v_org_id, 'Downtown Properties LLC', 'Residential',
    '123 Main Street', 'San Francisco', 'CA', '94102', 'US',
    '415-555-0100', 'downtown@airentaltool.com', true, now() - interval '2 years'
  );

  -- Create Business 2: Suburban Rentals
  INSERT INTO businesses (
    id, organization_id, business_name, business_type,
    address_line1, city, state, postal_code, country,
    phone, email, is_active, created_at
  )
  VALUES (
    v_business2_id, v_org_id, 'Suburban Rentals Inc', 'Residential',
    '456 Oak Avenue', 'Oakland', 'CA', '94601', 'US',
    '510-555-0200', 'suburban@airentaltool.com', true, now() - interval '18 months'
  );

  -- Create Property 1: Mission District Apartments
  INSERT INTO properties (
    id, organization_id, business_id, name, property_type,
    address, city, state, postal_code, country, total_units, created_at
  )
  VALUES (
    v_property1_id, v_org_id, v_business1_id, 'Mission District Apartments', 'Multi-Family',
    '789 Mission St', 'San Francisco', 'CA', '94103', 'US', 3, now() - interval '2 years'
  );

  -- Create Property 2: Marina View Condos
  INSERT INTO properties (
    id, organization_id, business_id, name, property_type,
    address, city, state, postal_code, country, total_units, created_at
  )
  VALUES (
    v_property2_id, v_org_id, v_business1_id, 'Marina View Condos', 'Condo',
    '321 Bay Street', 'San Francisco', 'CA', '94123', 'US', 2, now() - interval '18 months'
  );

  -- Create Property 3: Oakland Family Homes
  INSERT INTO properties (
    id, organization_id, business_id, name, property_type,
    address, city, state, postal_code, country, total_units, created_at
  )
  VALUES (
    v_property3_id, v_org_id, v_business2_id, 'Oakland Family Homes', 'Single-Family',
    '555 Park Boulevard', 'Oakland', 'CA', '94610', 'US', 1, now() - interval '15 months'
  );

  -- Create Units for Property 1
  INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status, created_at)
  VALUES
    (v_unit1_id, v_property1_id, 'Unit 101', 2, 2, 950, 2800, 'occupied', now() - interval '2 years'),
    (v_unit2_id, v_property1_id, 'Unit 102', 1, 1, 650, 2200, 'occupied', now() - interval '2 years'),
    (v_unit3_id, v_property1_id, 'Unit 201', 2, 2, 1000, 3000, 'vacant', now() - interval '2 years');

  -- Create Units for Property 2
  INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status, created_at)
  VALUES
    (v_unit4_id, v_property2_id, 'Unit A', 3, 2, 1400, 4500, 'occupied', now() - interval '18 months'),
    (v_unit5_id, v_property2_id, 'Unit B', 2, 2, 1100, 3800, 'occupied', now() - interval '18 months');

  -- Create Unit for Property 3
  INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status, created_at)
  VALUES
    (v_unit6_id, v_property3_id, 'Main House', 4, 3, 2200, 5500, 'occupied', now() - interval '15 months');

  -- Create Tenants
  INSERT INTO tenants (id, organization_id, first_name, last_name, email, phone, created_at)
  VALUES
    (v_tenant1_id, v_org_id, 'John', 'Smith', 'john.smith@email.com', '415-555-1001', now() - interval '20 months'),
    (v_tenant2_id, v_org_id, 'Sarah', 'Johnson', 'sarah.j@email.com', '415-555-1002', now() - interval '18 months'),
    (v_tenant3_id, v_org_id, 'Michael', 'Brown', 'mbrown@email.com', '415-555-1003', now() - interval '15 months'),
    (v_tenant4_id, v_org_id, 'Emily', 'Davis', 'emily.d@email.com', '510-555-1004', now() - interval '12 months'),
    (v_tenant5_id, v_org_id, 'Robert', 'Wilson', 'rwilson@email.com', '510-555-1005', now() - interval '10 months');

  -- Create Leases with historical data
  INSERT INTO leases (id, unit_id, tenant_id, lease_start, lease_end, rent_amount, security_deposit, status, created_at)
  VALUES
    (v_lease1_id, v_unit1_id, v_tenant1_id, now() - interval '20 months', now() + interval '4 months', 2800, 5600, 'active', now() - interval '20 months'),
    (v_lease2_id, v_unit2_id, v_tenant2_id, now() - interval '18 months', now() + interval '6 months', 2200, 4400, 'active', now() - interval '18 months'),
    (v_lease3_id, v_unit4_id, v_tenant3_id, now() - interval '15 months', now() + interval '9 months', 4500, 9000, 'active', now() - interval '15 months'),
    (v_lease4_id, v_unit5_id, v_tenant4_id, now() - interval '12 months', now() + interval '12 months', 3800, 7600, 'active', now() - interval '12 months'),
    (v_lease5_id, v_unit6_id, v_tenant5_id, now() - interval '10 months', now() + interval '14 months', 5500, 11000, 'active', now() - interval '10 months');

  -- Generate 20 months of payment history for Tenant 1 (mostly on-time, few late)
  FOR months_back IN 0..19 LOOP
    payment_date := (now() - interval '20 months' + (months_back || ' months')::interval)::date;

    -- 90% on-time, 10% late
    IF random() < 0.9 THEN
      -- On-time payment
      INSERT INTO tenant_payments (
        organization_id, tenant_id, lease_id, amount, payment_date,
        due_date, status, payment_method, created_at
      )
      VALUES (
        v_org_id, v_tenant1_id, v_lease1_id, 2800,
        payment_date,
        payment_date,
        'completed', 'bank_transfer', payment_date
      );
    ELSE
      -- Late payment (5-10 days)
      INSERT INTO tenant_payments (
        organization_id, tenant_id, lease_id, amount, payment_date,
        due_date, status, payment_method, created_at
      )
      VALUES (
        v_org_id, v_tenant1_id, v_lease1_id, 2800,
        payment_date + interval '7 days',
        payment_date,
        'completed', 'bank_transfer', payment_date + interval '7 days'
      );
    END IF;
  END LOOP;

  -- Generate 18 months of payment history for Tenant 2 (perfect record)
  FOR months_back IN 0..17 LOOP
    payment_date := (now() - interval '18 months' + (months_back || ' months')::interval)::date;

    INSERT INTO tenant_payments (
      organization_id, tenant_id, lease_id, amount, payment_date,
      due_date, status, payment_method, created_at
    )
    VALUES (
      v_org_id, v_tenant2_id, v_lease2_id, 2200,
      payment_date,
      payment_date,
      'completed', 'credit_card', payment_date
    );
  END LOOP;

  -- Generate 15 months of payment history for Tenant 3 (some late payments)
  FOR months_back IN 0..14 LOOP
    payment_date := (now() - interval '15 months' + (months_back || ' months')::interval)::date;

    IF random() < 0.7 THEN
      INSERT INTO tenant_payments (
        organization_id, tenant_id, lease_id, amount, payment_date,
        due_date, status, payment_method, created_at
      )
      VALUES (
        v_org_id, v_tenant3_id, v_lease3_id, 4500,
        payment_date,
        payment_date,
        'completed', 'check', payment_date
      );
    ELSE
      INSERT INTO tenant_payments (
        organization_id, tenant_id, lease_id, amount, payment_date,
        due_date, status, payment_method, created_at
      )
      VALUES (
        v_org_id, v_tenant3_id, v_lease3_id, 4500,
        payment_date + interval '12 days',
        payment_date,
        'completed', 'check', payment_date + interval '12 days'
      );
    END IF;
  END LOOP;

  -- Generate 12 months of payment history for Tenant 4
  FOR months_back IN 0..11 LOOP
    payment_date := (now() - interval '12 months' + (months_back || ' months')::interval)::date;

    INSERT INTO tenant_payments (
      organization_id, tenant_id, lease_id, amount, payment_date,
      due_date, status, payment_method, created_at
    )
    VALUES (
      v_org_id, v_tenant4_id, v_lease4_id, 3800,
      payment_date,
      payment_date,
      'completed', 'bank_transfer', payment_date
    );
  END LOOP;

  -- Generate 10 months of payment history for Tenant 5 (one pending payment)
  FOR months_back IN 0..9 LOOP
    payment_date := (now() - interval '10 months' + (months_back || ' months')::interval)::date;

    IF months_back < 9 THEN
      INSERT INTO tenant_payments (
        organization_id, tenant_id, lease_id, amount, payment_date,
        due_date, status, payment_method, created_at
      )
      VALUES (
        v_org_id, v_tenant5_id, v_lease5_id, 5500,
        payment_date,
        payment_date,
        'completed', 'bank_transfer', payment_date
      );
    ELSE
      -- Current month pending
      INSERT INTO tenant_payments (
        organization_id, tenant_id, lease_id, amount, payment_date,
        due_date, status, payment_method, created_at
      )
      VALUES (
        v_org_id, v_tenant5_id, v_lease5_id, 5500,
        NULL,
        payment_date,
        'pending', NULL, payment_date
      );
    END IF;
  END LOOP;

  -- Create maintenance requests (mix of completed, in-progress, and pending)
  INSERT INTO maintenance_requests (
    organization_id, property_id, unit_id, tenant_id,
    title, description, priority, status, created_at
  )
  VALUES
    (v_org_id, v_property1_id, v_unit1_id, v_tenant1_id,
     'Leaking Faucet', 'Kitchen faucet is dripping constantly', 'medium', 'completed', now() - interval '3 months'),
    (v_org_id, v_property1_id, v_unit2_id, v_tenant2_id,
     'AC Not Working', 'Air conditioning unit stopped working', 'high', 'completed', now() - interval '4 months'),
    (v_org_id, v_property2_id, v_unit4_id, v_tenant3_id,
     'Water Heater Issue', 'Water not getting hot enough', 'high', 'in_progress', now() - interval '2 days'),
    (v_org_id, v_property2_id, v_unit5_id, v_tenant4_id,
     'Window Won''t Close', 'Bedroom window stuck open', 'low', 'pending', now() - interval '1 week'),
    (v_org_id, v_property3_id, v_unit6_id, v_tenant5_id,
     'Garage Door Opener', 'Remote not working properly', 'low', 'completed', now() - interval '5 months');

  -- Create some expenses
  INSERT INTO expenses (
    organization_id, property_id, category, amount, expense_date,
    vendor, description, created_at
  )
  VALUES
    (v_org_id, v_property1_id, 'Maintenance', 350.00, now() - interval '3 months',
     'Joe''s Plumbing', 'Fixed leaking faucet in Unit 101', now() - interval '3 months'),
    (v_org_id, v_property1_id, 'Maintenance', 850.00, now() - interval '4 months',
     'Cool Air HVAC', 'AC repair Unit 102', now() - interval '4 months'),
    (v_org_id, v_property2_id, 'Maintenance', 1200.00, now() - interval '6 months',
     'Elite Property Services', 'Annual HVAC maintenance', now() - interval '6 months'),
    (v_org_id, v_property3_id, 'Utilities', 245.00, now() - interval '1 month',
     'PG&E', 'Property utilities - October', now() - interval '1 month'),
    (v_org_id, v_property1_id, 'Insurance', 1800.00, now() - interval '11 months',
     'State Farm', 'Annual property insurance', now() - interval '11 months');

  RAISE NOTICE '✅ Test data created successfully!';
  RAISE NOTICE 'Organization: Demo Property Management';
  RAISE NOTICE 'Businesses: 2 (Downtown Properties LLC, Suburban Rentals Inc)';
  RAISE NOTICE 'Properties: 3 (Mission District, Marina View, Oakland Homes)';
  RAISE NOTICE 'Units: 6 total';
  RAISE NOTICE 'Tenants: 5 active';
  RAISE NOTICE 'Payment History: ~90 payments over 20 months';
  RAISE NOTICE 'Maintenance Requests: 5 (various statuses)';
  RAISE NOTICE 'Expenses: 5 historical records';
END $$;

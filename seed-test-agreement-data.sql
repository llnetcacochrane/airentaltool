-- Test data for Agreement System
-- Run this after applying the lease-agreement-migration.sql

-- Create a test agreement template
INSERT INTO agreement_templates (
  created_by,
  template_name,
  description,
  agreement_type,
  agreement_title,
  content,
  generated_text,
  default_lease_term_months,
  default_rent_amount,
  default_security_deposit,
  payment_frequency,
  pet_policy,
  house_rules,
  cancellation_policy,
  is_active,
  is_default
) VALUES (
  auth.uid(), -- Replace with actual user ID when testing
  'Standard Residential Lease',
  'Standard 12-month lease agreement for residential properties',
  'lease',
  'Residential Lease Agreement',
  '{"propertyOwnerName": "John Smith", "rentalAmount": "1500", "leaseTermMonths": "12", "securityDeposit": "1500", "petPolicy": "No pets allowed", "houseRules": "Quiet hours 10pm-7am. No smoking indoors. Keep common areas clean.", "maxOccupants": "4"}',
  'RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on [DATE], between:

LANDLORD: John Smith
TENANT: [TENANT NAME]

PROPERTY: [PROPERTY ADDRESS]

1. LEASE TERM
The lease term shall be for 12 months, commencing on [START DATE] and ending on [END DATE].

2. RENT
Tenant agrees to pay monthly rent of $1,500.00, due on the 1st day of each month. Payment shall be made via [PAYMENT METHOD].

3. SECURITY DEPOSIT
Tenant shall pay a security deposit of $1,500.00, which will be held by Landlord and returned within 30 days after the lease termination, less any deductions for damages beyond normal wear and tear.

4. UTILITIES
Tenant is responsible for: electricity, gas, water/sewer, internet, and cable/satellite services.

5. MAINTENANCE
Tenant is responsible for routine maintenance and minor repairs. Landlord is responsible for major repairs and structural maintenance.

6. PET POLICY
No pets allowed without written permission from Landlord. Unauthorized pets will result in immediate termination of lease.

7. HOUSE RULES
- Quiet hours: 10:00 PM - 7:00 AM
- No smoking inside the property
- Keep common areas clean and free of personal belongings
- Maximum occupancy: 4 persons

8. TERMINATION
Either party may terminate this lease with 30 days written notice. Early termination by Tenant may result in loss of security deposit.

9. SIGNATURES
By signing below, both parties agree to all terms and conditions set forth in this Agreement.

______________________          ______________________
Landlord Signature              Tenant Signature

______________________          ______________________
Date                           Date',
  12,
  1500.00,
  1500.00,
  'monthly',
  'No pets allowed',
  'Quiet hours 10pm-7am. No smoking indoors. Keep common areas clean.',
  '30-day written notice required for termination',
  true,
  true
);

-- Note: To test the full workflow, you'll need to:
-- 1. Have a user account created
-- 2. Have at least one business, property, unit, and tenant
-- 3. Use the Agreement Builder UI to create templates
-- 4. Generate agreements from templates
-- 5. Send agreements to tenants
-- 6. Sign agreements as tenant

-- Example: Generate agreement from template (run as landlord)
-- SELECT generate_agreement_from_template(
--   '[TEMPLATE_ID]'::uuid,
--   '[TENANT_ID]'::uuid,
--   '[LEASE_ID]'::uuid,
--   '{"start_date": "2024-01-01", "end_date": "2024-12-31"}'::jsonb
-- );

-- Example: Send agreement to tenant
-- SELECT send_agreement_to_tenant('[AGREEMENT_ID]'::uuid);

-- Example: Sign agreement as tenant
-- SELECT sign_agreement(
--   '[AGREEMENT_ID]'::uuid,
--   'tenant',
--   'John Doe',
--   'typed'
-- );

-- Example: Get user's templates
-- SELECT * FROM agreement_templates WHERE created_by = auth.uid();

-- Example: Get pending signatures
-- SELECT * FROM lease_agreements
-- WHERE created_by = auth.uid()
-- AND status IN ('sent', 'viewed');

-- Example: Get audit log
-- SELECT * FROM agreement_audit_log
-- WHERE agreement_id = '[AGREEMENT_ID]'::uuid
-- ORDER BY created_at DESC;

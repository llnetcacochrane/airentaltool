-- Migration: Add application_id support to business_user_messages (Phase 3 Messaging)
-- This allows messages to be tied to rental applications, not just business users

-- Step 1: Add application_id column
ALTER TABLE business_user_messages
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES rental_applications(id) ON DELETE CASCADE;

-- Step 2: Make business_user_id nullable (currently NOT NULL)
ALTER TABLE business_user_messages
  ALTER COLUMN business_user_id DROP NOT NULL;

-- Step 3: Create index for application-based message lookups
CREATE INDEX IF NOT EXISTS idx_business_user_messages_application_id
  ON business_user_messages(application_id);

-- Step 4: Add check constraint - Either business_user_id OR application_id must be set
-- First drop existing constraint if exists
ALTER TABLE business_user_messages
  DROP CONSTRAINT IF EXISTS chk_message_target;

ALTER TABLE business_user_messages
  ADD CONSTRAINT chk_message_target
  CHECK (business_user_id IS NOT NULL OR application_id IS NOT NULL);

-- Step 5: RLS Policies for applicant access to messages by application_id

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS business_user_messages_applicant_select ON business_user_messages;
DROP POLICY IF EXISTS business_user_messages_applicant_insert ON business_user_messages;

-- Applicants can see messages for their own applications (matched by email)
CREATE POLICY business_user_messages_applicant_select ON business_user_messages
  FOR SELECT USING (
    application_id IN (
      SELECT ra.id FROM rental_applications ra
      WHERE ra.applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Applicants can send messages for their own applications
CREATE POLICY business_user_messages_applicant_insert ON business_user_messages
  FOR INSERT WITH CHECK (
    (
      -- Either via business_user_id
      business_user_id IN (
        SELECT id FROM business_users WHERE auth_user_id = auth.uid()
      )
      OR
      -- Or via application_id for their applications
      application_id IN (
        SELECT ra.id FROM rental_applications ra
        WHERE ra.applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
    AND sender_type = 'user'
  );

-- Step 6: Allow managers to insert messages with only application_id (no business_user_id required)
-- Update existing owner insert policy
DROP POLICY IF EXISTS business_user_messages_owner_insert ON business_user_messages;

CREATE POLICY business_user_messages_owner_insert ON business_user_messages
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Add policy for managers to select messages by application_id
DROP POLICY IF EXISTS business_user_messages_owner_app_select ON business_user_messages;

CREATE POLICY business_user_messages_owner_app_select ON business_user_messages
  FOR SELECT USING (
    application_id IN (
      SELECT ra.id FROM rental_applications ra
      WHERE ra.organization_id IN (
        SELECT id FROM businesses WHERE owner_user_id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON business_user_messages TO authenticated;
GRANT SELECT, INSERT ON business_user_messages TO anon;

COMMENT ON COLUMN business_user_messages.application_id IS 'Optional link to rental application for application-specific messaging';

-- Migration: Add Notification System and Late Fee Tracking
-- Created: 2024-12-22
-- Purpose: Add tables for email notifications, templates, and late fee management

-- ============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  send_days_before INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(type)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- ============================================================================
-- SCHEDULED NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_org ON scheduled_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON scheduled_notifications(status, scheduled_for)
  WHERE status = 'pending';

-- ============================================================================
-- LATE FEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS late_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Fee details
  original_amount_cents BIGINT NOT NULL,
  late_fee_cents BIGINT NOT NULL,
  total_amount_cents BIGINT NOT NULL,

  -- Dates
  original_due_date DATE NOT NULL,
  assessed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'waived')),
  waived_reason TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_late_fees_business ON late_fees(business_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_lease ON late_fees(lease_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_tenant ON late_fees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_status ON late_fees(status);
CREATE INDEX IF NOT EXISTS idx_late_fees_due_date ON late_fees(original_due_date);

-- ============================================================================
-- LATE FEE CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS late_fee_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Fee calculation method
  fee_type VARCHAR(20) DEFAULT 'fixed' CHECK (fee_type IN ('fixed', 'percentage', 'both')),
  fixed_fee_cents BIGINT DEFAULT 0,
  percentage_rate DECIMAL(5,2) DEFAULT 0.00, -- e.g., 5.00 for 5%

  -- Grace period
  grace_period_days INTEGER DEFAULT 0,

  -- Caps
  max_fee_cents BIGINT, -- Maximum late fee amount

  -- Recurring fees
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency_days INTEGER DEFAULT 30,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id)
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_late_fee_config_business ON late_fee_configurations(business_id);

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Rent reminder preferences
  rent_reminders_enabled BOOLEAN DEFAULT true,
  rent_reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1],

  -- Payment confirmation
  payment_confirmations_enabled BOOLEAN DEFAULT true,

  -- Maintenance notifications
  maintenance_updates_enabled BOOLEAN DEFAULT true,

  -- Lease reminders
  lease_reminders_enabled BOOLEAN DEFAULT true,
  lease_reminder_days INTEGER[] DEFAULT ARRAY[90, 60, 30, 14, 7],

  -- Late fee notifications
  late_fee_notifications_enabled BOOLEAN DEFAULT true,

  -- Announcements
  announcements_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id)
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_notification_prefs_business ON notification_preferences(business_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Notification Templates (public read for active templates)
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active templates" ON notification_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated users to read all templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Scheduled Notifications (business owners only)
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's notifications" ON scheduled_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = organization_id
      AND ubr.is_active = true
    )
  );

CREATE POLICY "Users can insert notifications for their organization" ON scheduled_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = organization_id
      AND ubr.is_active = true
    )
  );

-- Late Fees (business owners only)
ALTER TABLE late_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business's late fees" ON late_fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = business_id
      AND ubr.is_active = true
    )
  );

CREATE POLICY "Users can manage their business's late fees" ON late_fees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = business_id
      AND ubr.is_active = true
    )
  );

-- Late Fee Configurations (business owners only)
ALTER TABLE late_fee_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business's late fee config" ON late_fee_configurations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = business_id
      AND ubr.is_active = true
    )
  );

CREATE POLICY "Users can manage their business's late fee config" ON late_fee_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = business_id
      AND ubr.is_active = true
    )
  );

-- Notification Preferences (business owners only)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business's notification preferences" ON notification_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = business_id
      AND ubr.is_active = true
    )
  );

CREATE POLICY "Users can manage their business's notification preferences" ON notification_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = business_id
      AND ubr.is_active = true
    )
  );

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Calculate late fee for a payment
CREATE OR REPLACE FUNCTION calculate_late_fee(
  p_business_id UUID,
  p_original_amount_cents BIGINT,
  p_days_overdue INTEGER
) RETURNS BIGINT AS $$
DECLARE
  v_config RECORD;
  v_late_fee BIGINT := 0;
  v_fixed_fee BIGINT := 0;
  v_percentage_fee BIGINT := 0;
BEGIN
  -- Get late fee configuration
  SELECT * INTO v_config
  FROM late_fee_configurations
  WHERE business_id = p_business_id
  AND is_active = true;

  -- If no config or within grace period, return 0
  IF v_config IS NULL OR p_days_overdue <= v_config.grace_period_days THEN
    RETURN 0;
  END IF;

  -- Calculate based on fee type
  IF v_config.fee_type IN ('fixed', 'both') THEN
    v_fixed_fee := v_config.fixed_fee_cents;
  END IF;

  IF v_config.fee_type IN ('percentage', 'both') THEN
    v_percentage_fee := (p_original_amount_cents * v_config.percentage_rate / 100)::BIGINT;
  END IF;

  -- Combine fees
  IF v_config.fee_type = 'both' THEN
    v_late_fee := v_fixed_fee + v_percentage_fee;
  ELSIF v_config.fee_type = 'fixed' THEN
    v_late_fee := v_fixed_fee;
  ELSE
    v_late_fee := v_percentage_fee;
  END IF;

  -- Apply cap if configured
  IF v_config.max_fee_cents IS NOT NULL AND v_late_fee > v_config.max_fee_cents THEN
    v_late_fee := v_config.max_fee_cents;
  END IF;

  RETURN v_late_fee;
END;
$$ LANGUAGE plpgsql;

-- Process overdue payments and assess late fees
CREATE OR REPLACE FUNCTION assess_late_fees_for_business(p_business_id UUID)
RETURNS TABLE(
  payment_schedule_id UUID,
  late_fee_cents BIGINT,
  late_fee_id UUID
) AS $$
DECLARE
  v_schedule RECORD;
  v_late_fee_cents BIGINT;
  v_days_overdue INTEGER;
  v_late_fee_id UUID;
BEGIN
  -- Find all overdue payment schedules for this business
  FOR v_schedule IN
    SELECT
      ps.id,
      ps.due_amount,
      ps.paid_amount,
      ps.payment_date,
      ps.lease_id,
      l.unit_id,
      u.property_id,
      p.business_id
    FROM payment_schedules ps
    JOIN leases l ON ps.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.business_id = p_business_id
    AND ps.is_paid = false
    AND ps.payment_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM late_fees lf
      WHERE lf.payment_schedule_id = ps.id
      AND lf.status != 'waived'
    )
  LOOP
    -- Calculate days overdue
    v_days_overdue := CURRENT_DATE - v_schedule.payment_date;

    -- Calculate late fee
    v_late_fee_cents := calculate_late_fee(
      p_business_id,
      (v_schedule.due_amount * 100)::BIGINT,
      v_days_overdue
    );

    -- Only create late fee if amount > 0
    IF v_late_fee_cents > 0 THEN
      -- Insert late fee record
      INSERT INTO late_fees (
        business_id,
        payment_schedule_id,
        lease_id,
        unit_id,
        tenant_id,
        original_amount_cents,
        late_fee_cents,
        total_amount_cents,
        original_due_date,
        status
      )
      SELECT
        p_business_id,
        v_schedule.id,
        v_schedule.lease_id,
        v_schedule.unit_id,
        l.tenant_id,
        (v_schedule.due_amount * 100)::BIGINT,
        v_late_fee_cents,
        ((v_schedule.due_amount * 100)::BIGINT + v_late_fee_cents),
        v_schedule.payment_date,
        'unpaid'
      FROM leases l
      WHERE l.id = v_schedule.lease_id
      RETURNING id INTO v_late_fee_id;

      -- Return the result
      payment_schedule_id := v_schedule.id;
      late_fee_cents := v_late_fee_cents;
      late_fee_id := v_late_fee_id;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on late_fees
CREATE OR REPLACE FUNCTION update_late_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_late_fees_updated_at
  BEFORE UPDATE ON late_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_late_fees_updated_at();

-- Update updated_at timestamp on late_fee_configurations
CREATE TRIGGER trigger_update_late_fee_config_updated_at
  BEFORE UPDATE ON late_fee_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_late_fees_updated_at();

-- Update updated_at timestamp on notification_preferences
CREATE TRIGGER trigger_update_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_late_fees_updated_at();

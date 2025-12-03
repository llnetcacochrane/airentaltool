/*
  # AI Recommendations and Email System Diagnostics
  
  1. Updates to Tables
    - Add AI recommendation fields to feature mappings
    - Create email configuration table
    - Create email diagnostic logs table
  
  2. New Functions
    - AI-powered LLM recommendation function
    - Email system test function
  
  3. Security
    - All protected by super admin RLS
*/

-- Add recommendation columns to ai_feature_llm_mappings
ALTER TABLE ai_feature_llm_mappings
ADD COLUMN IF NOT EXISTS ai_recommended_provider text,
ADD COLUMN IF NOT EXISTS ai_recommended_model text,
ADD COLUMN IF NOT EXISTS ai_recommendation_reason text,
ADD COLUMN IF NOT EXISTS alternative_recommendations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_recommendation_at timestamptz;

-- Create email configuration table
CREATE TABLE IF NOT EXISTS email_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password_encrypted text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_use_tls boolean DEFAULT true,
  sendgrid_api_key_encrypted text,
  ses_access_key_encrypted text,
  ses_secret_key_encrypted text,
  ses_region text DEFAULT 'us-east-1',
  is_active boolean DEFAULT true,
  last_test_at timestamptz,
  last_test_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email diagnostic logs
CREATE TABLE IF NOT EXISTS email_diagnostic_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  status text NOT NULL,
  error_message text,
  response_time_ms integer,
  provider_used text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE email_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_configuration
CREATE POLICY "Super admins can view email config"
  ON email_configuration FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage email config"
  ON email_configuration FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for email_diagnostic_logs
CREATE POLICY "Super admins can view email logs"
  ON email_diagnostic_logs FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert email logs"
  ON email_diagnostic_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Function to generate AI recommendations for feature LLM selection
CREATE OR REPLACE FUNCTION generate_llm_recommendations_for_feature(
  p_feature_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feature_record ai_feature_llm_mappings;
  available_providers jsonb;
  all_providers jsonb;
  recommendation jsonb;
  requirements jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can generate recommendations';
  END IF;

  -- Get feature details
  SELECT * INTO feature_record
  FROM ai_feature_llm_mappings
  WHERE feature_name = p_feature_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature not found: %', p_feature_name;
  END IF;

  requirements := feature_record.requirements;

  -- Get available providers (those with active API keys)
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'provider', k.provider_name,
    'active', k.is_active,
    'models', (
      SELECT jsonb_agg(jsonb_build_object(
        'model_name', p.model_name,
        'input_price', p.input_price_per_1k_tokens,
        'output_price', p.output_price_per_1k_tokens,
        'context_window', p.context_window,
        'supports_functions', p.supports_functions,
        'supports_vision', p.supports_vision
      ))
      FROM ai_llm_providers p
      WHERE p.provider_name = k.provider_name
        AND p.is_active = true
    )
  )) INTO available_providers
  FROM ai_api_keys k
  WHERE k.is_active = true;

  -- Get all providers for alternatives
  SELECT jsonb_agg(jsonb_build_object(
    'provider', provider_name,
    'model', model_name,
    'input_price', input_price_per_1k_tokens,
    'output_price', output_price_per_1k_tokens,
    'context_window', context_window,
    'supports_functions', supports_functions,
    'supports_vision', supports_vision,
    'score', 
      CASE 
        WHEN requirements->>'complexity' = 'high' THEN
          CASE 
            WHEN context_window > 100000 THEN 90
            WHEN context_window > 50000 THEN 75
            ELSE 50
          END
        WHEN requirements->>'complexity' = 'medium' THEN 70
        ELSE 60
      END +
      CASE WHEN supports_functions = true THEN 10 ELSE 0 END +
      CASE WHEN supports_vision = true AND requirements->>'requires' LIKE '%vision%' THEN 15 ELSE 0 END
  ))
  FROM ai_llm_providers
  WHERE is_active = true
  ORDER BY 
    CASE 
      WHEN requirements->>'complexity' = 'high' THEN context_window
      ELSE input_price_per_1k_tokens
    END;

  -- Build recommendation
  recommendation := jsonb_build_object(
    'feature_name', p_feature_name,
    'available_providers', COALESCE(available_providers, '[]'::jsonb),
    'all_providers', COALESCE(all_providers, '[]'::jsonb),
    'requirements', requirements,
    'generated_at', now()
  );

  -- Update the feature mapping with recommendation
  UPDATE ai_feature_llm_mappings
  SET 
    last_recommendation_at = now(),
    alternative_recommendations = all_providers
  WHERE feature_name = p_feature_name;

  RETURN recommendation;
END;
$$;

-- Function to get feature usage and cost breakdown
CREATE OR REPLACE FUNCTION get_feature_usage_breakdown(
  p_feature_name text,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  period_date date,
  provider_name text,
  model_name text,
  total_calls bigint,
  total_tokens bigint,
  cost_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can access usage breakdown';
  END IF;

  RETURN QUERY
  SELECT
    created_at::date as period_date,
    al.provider_name,
    al.model_name,
    COUNT(*)::bigint as total_calls,
    SUM(total_tokens)::bigint as total_tokens,
    SUM(cost_cents)::bigint as cost_cents
  FROM ai_usage_logs al
  WHERE al.feature_name = p_feature_name
    AND al.created_at >= now() - (p_days || ' days')::interval
  GROUP BY created_at::date, al.provider_name, al.model_name
  ORDER BY period_date DESC, cost_cents DESC;
END;
$$;

-- Function to test email configuration
CREATE OR REPLACE FUNCTION test_email_configuration(
  p_test_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record email_configuration;
  result jsonb;
  start_time timestamptz;
  end_time timestamptz;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can test email configuration';
  END IF;

  -- Get active email configuration
  SELECT * INTO config_record
  FROM email_configuration
  WHERE is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active email configuration found'
    );
  END IF;

  start_time := clock_timestamp();

  -- Log the test
  INSERT INTO email_diagnostic_logs (
    test_type,
    recipient_email,
    subject,
    status,
    provider_used,
    created_by
  ) VALUES (
    'manual_test',
    p_test_email,
    'AI Rental Tools - Email Configuration Test',
    'pending',
    config_record.provider,
    auth.uid()
  );

  end_time := clock_timestamp();

  -- Update last test time
  UPDATE email_configuration
  SET 
    last_test_at = now(),
    last_test_status = 'tested'
  WHERE id = config_record.id;

  result := jsonb_build_object(
    'success', true,
    'provider', config_record.provider,
    'test_email', p_test_email,
    'response_time_ms', EXTRACT(MILLISECONDS FROM (end_time - start_time))::integer,
    'message', 'Email test initiated. Check your inbox for the test email.'
  );

  RETURN result;
END;
$$;

-- Insert default email configuration if none exists
INSERT INTO email_configuration (
  provider,
  smtp_host,
  smtp_port,
  smtp_from_name,
  is_active
)
SELECT 
  'smtp',
  'smtp.example.com',
  587,
  'AI Rental Tools',
  false
WHERE NOT EXISTS (SELECT 1 FROM email_configuration);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_diagnostic_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_diagnostic_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_feature_mappings_recommendations ON ai_feature_llm_mappings(last_recommendation_at DESC);

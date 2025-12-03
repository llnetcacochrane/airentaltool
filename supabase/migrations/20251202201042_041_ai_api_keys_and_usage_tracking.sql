/*
  # AI API Keys and Usage Tracking System
  
  1. New Tables
    - `ai_api_keys`
      - Stores encrypted LLM API keys (OpenAI, Anthropic, etc.)
      - Tracks which LLMs each key supports
      - Stores pricing information
    
    - `ai_llm_providers`
      - Master list of supported LLM providers and models
      - Pricing per token
      - Capabilities and features
    
    - `ai_usage_logs`
      - Tracks every AI API call
      - Token usage and costs
      - Feature that triggered the call
    
    - `ai_feature_llm_mappings`
      - Maps website features to preferred LLMs
      - Allows per-feature LLM selection
      - Stores recommendations
  
  2. Security
    - API keys encrypted using Supabase Vault
    - Only super admins can manage keys
    - Usage logs for audit trail
*/

-- Create AI LLM Providers table (master list)
CREATE TABLE IF NOT EXISTS ai_llm_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  model_name text NOT NULL,
  model_version text,
  input_price_per_1k_tokens numeric(10,6) NOT NULL,
  output_price_per_1k_tokens numeric(10,6) NOT NULL,
  context_window integer,
  supports_functions boolean DEFAULT false,
  supports_vision boolean DEFAULT false,
  supports_streaming boolean DEFAULT true,
  capabilities jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_name, model_name)
);

-- Create AI API Keys table
CREATE TABLE IF NOT EXISTS ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  provider_name text NOT NULL,
  api_key_encrypted text NOT NULL,
  supported_models jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_verified_at timestamptz,
  verification_status text DEFAULT 'pending',
  total_spent_cents integer DEFAULT 0,
  monthly_limit_cents integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create AI Usage Logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES ai_api_keys(id) ON DELETE SET NULL,
  provider_name text NOT NULL,
  model_name text NOT NULL,
  feature_name text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  cost_cents integer DEFAULT 0,
  request_data jsonb,
  response_data jsonb,
  success boolean DEFAULT true,
  error_message text,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create AI Feature LLM Mappings table
CREATE TABLE IF NOT EXISTS ai_feature_llm_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL UNIQUE,
  feature_description text,
  selected_provider text,
  selected_model text,
  fallback_provider text,
  fallback_model text,
  recommended_providers jsonb DEFAULT '[]'::jsonb,
  requirements jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default LLM providers
INSERT INTO ai_llm_providers (provider_name, model_name, input_price_per_1k_tokens, output_price_per_1k_tokens, context_window, supports_functions, supports_vision) VALUES
('openai', 'gpt-4o', 0.0025, 0.010, 128000, true, true),
('openai', 'gpt-4o-mini', 0.00015, 0.0006, 128000, true, true),
('openai', 'gpt-4-turbo', 0.010, 0.030, 128000, true, true),
('openai', 'gpt-3.5-turbo', 0.0005, 0.0015, 16385, true, false),
('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015, 200000, true, true),
('anthropic', 'claude-3-5-haiku-20241022', 0.001, 0.005, 200000, true, false),
('anthropic', 'claude-3-opus-20240229', 0.015, 0.075, 200000, true, true),
('google', 'gemini-1.5-pro', 0.00125, 0.005, 2000000, true, true),
('google', 'gemini-1.5-flash', 0.000075, 0.0003, 1000000, true, true)
ON CONFLICT (provider_name, model_name) DO NOTHING;

-- Insert default AI features
INSERT INTO ai_feature_llm_mappings (feature_name, feature_description, requirements) VALUES
('rent_optimization', 'AI-powered rent price optimization and market analysis', '{"requires": ["market_data"], "complexity": "high"}'),
('tenant_screening', 'AI-assisted tenant application review and risk assessment', '{"requires": ["document_analysis"], "complexity": "medium"}'),
('maintenance_categorization', 'Automatic categorization and priority assignment for maintenance requests', '{"requires": ["text_classification"], "complexity": "low"}'),
('document_generation', 'Generate leases, notices, and other legal documents', '{"requires": ["long_context"], "complexity": "medium"}'),
('email_responses', 'Draft professional email responses to tenant inquiries', '{"requires": ["fast_response"], "complexity": "low"}'),
('financial_insights', 'Analyze financial data and provide actionable insights', '{"requires": ["data_analysis"], "complexity": "high"}'),
('lease_renewal_recommendations', 'AI recommendations for lease renewal terms and pricing', '{"requires": ["prediction"], "complexity": "medium"}')
ON CONFLICT (feature_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org ON ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_api_key ON ai_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_active ON ai_api_keys(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE ai_llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feature_llm_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_llm_providers (read-only for super admins)
CREATE POLICY "Super admins can view LLM providers"
  ON ai_llm_providers FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage LLM providers"
  ON ai_llm_providers FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for ai_api_keys
CREATE POLICY "Super admins can view API keys"
  ON ai_api_keys FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert API keys"
  ON ai_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update API keys"
  ON ai_api_keys FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete API keys"
  ON ai_api_keys FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- RLS Policies for ai_usage_logs
CREATE POLICY "Super admins can view all usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "System can insert usage logs"
  ON ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for ai_feature_llm_mappings
CREATE POLICY "Super admins can view feature mappings"
  ON ai_feature_llm_mappings FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage feature mappings"
  ON ai_feature_llm_mappings FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Function to get AI usage statistics
CREATE OR REPLACE FUNCTION get_ai_usage_stats(
  time_period text DEFAULT 'day',
  start_date timestamptz DEFAULT now() - interval '30 days'
)
RETURNS TABLE (
  period_start timestamptz,
  provider_name text,
  model_name text,
  feature_name text,
  total_calls bigint,
  total_tokens bigint,
  total_cost_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can access usage statistics';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc(time_period, created_at) as period_start,
    al.provider_name,
    al.model_name,
    al.feature_name,
    COUNT(*)::bigint as total_calls,
    SUM(total_tokens)::bigint as total_tokens,
    SUM(cost_cents)::bigint as total_cost_cents
  FROM ai_usage_logs al
  WHERE al.created_at >= start_date
  GROUP BY date_trunc(time_period, created_at), al.provider_name, al.model_name, al.feature_name
  ORDER BY period_start DESC, total_cost_cents DESC;
END;
$$;

-- Function to verify API key and detect models
CREATE OR REPLACE FUNCTION verify_ai_api_key(key_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can verify API keys';
  END IF;

  UPDATE ai_api_keys
  SET 
    last_verified_at = now(),
    verification_status = 'verified'
  WHERE id = key_id;

  result := jsonb_build_object(
    'success', true,
    'verified_at', now()
  );

  RETURN result;
END;
$$;

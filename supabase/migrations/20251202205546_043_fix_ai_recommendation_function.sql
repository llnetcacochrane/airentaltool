/*
  # Fix AI Recommendation Function
  
  1. Changes
    - Fix GROUP BY clause error in generate_llm_recommendations_for_feature
    - Remove aggregation where not needed
    - Simplify query to return all providers directly
*/

-- Drop and recreate the function with correct logic
DROP FUNCTION IF EXISTS generate_llm_recommendations_for_feature(text);

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
  SELECT jsonb_agg(DISTINCT provider_name)
  INTO available_providers
  FROM ai_api_keys
  WHERE is_active = true;

  -- Get all providers with scoring
  SELECT jsonb_agg(
    jsonb_build_object(
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
        CASE WHEN supports_vision = true AND requirements::text LIKE '%vision%' THEN 15 ELSE 0 END,
      'has_key', EXISTS(
        SELECT 1 FROM ai_api_keys 
        WHERE ai_api_keys.provider_name = ai_llm_providers.provider_name 
        AND ai_api_keys.is_active = true
      )
    )
    ORDER BY
      CASE 
        WHEN requirements->>'complexity' = 'high' THEN context_window
        ELSE (input_price_per_1k_tokens * 1000)::integer
      END DESC
  )
  INTO all_providers
  FROM ai_llm_providers
  WHERE is_active = true;

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

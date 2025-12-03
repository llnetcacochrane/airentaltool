/*
  # Improved AI Recommendations with Better Scoring

  1. Changes
    - Enhanced scoring algorithm that considers cost vs quality tradeoffs
    - Added reasoning/explanation for each recommendation
    - Improved ranking based on feature requirements
    - Quality tier classification (premium, balanced, budget)
*/

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

  SELECT * INTO feature_record
  FROM ai_feature_llm_mappings
  WHERE feature_name = p_feature_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature not found: %', p_feature_name;
  END IF;

  requirements := feature_record.requirements;

  SELECT jsonb_agg(DISTINCT provider_name)
  INTO available_providers
  FROM ai_api_keys
  WHERE is_active = true;

  SELECT jsonb_agg(scored_model ORDER BY final_score DESC)
  INTO all_providers
  FROM (
    SELECT
      provider_name,
      model_name,
      input_price_per_1k_tokens,
      output_price_per_1k_tokens,
      context_window,
      supports_functions,
      supports_vision,
      jsonb_build_object(
        'provider', provider_name,
        'model', model_name,
        'input_price', input_price_per_1k_tokens,
        'output_price', output_price_per_1k_tokens,
        'context_window', context_window,
        'supports_functions', supports_functions,
        'supports_vision', supports_vision,
        'score', (
          CASE
            WHEN context_window > 128000 THEN 35
            WHEN context_window > 100000 THEN 30
            WHEN context_window > 32000 THEN 25
            WHEN context_window > 16000 THEN 20
            WHEN context_window > 8000 THEN 15
            ELSE 10
          END +
          CASE WHEN supports_functions = true THEN 15 ELSE 0 END +
          CASE WHEN supports_vision = true AND requirements::text LIKE '%vision%' THEN 15 ELSE 0 END +
          CASE
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.001 THEN 25
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.005 THEN 20
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.01 THEN 15
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.02 THEN 10
            ELSE 5
          END +
          CASE
            WHEN requirements->>'complexity' = 'high' THEN
              CASE
                WHEN context_window > 100000 THEN 10
                WHEN context_window > 32000 THEN 5
                ELSE -5
              END
            WHEN requirements->>'complexity' = 'medium' THEN 5
            ELSE 0
          END
        )::integer,
        'quality_tier',
          CASE
            WHEN context_window > 100000 AND supports_functions THEN 'premium'
            WHEN context_window > 32000 OR (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.01 THEN 'balanced'
            ELSE 'budget'
          END,
        'reasoning', (
          CASE
            WHEN context_window > 128000 AND (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.005 THEN
              'Best overall: Large context window with excellent pricing'
            WHEN context_window > 128000 THEN
              'Premium choice: Massive context window for complex tasks'
            WHEN context_window > 100000 AND (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.005 THEN
              'Excellent balance: Very large context with competitive pricing'
            WHEN context_window > 100000 THEN
              'High quality: Large context window for complex reasoning'
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.001 THEN
              'Best value: Extremely cost-effective for high-volume tasks'
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.005 AND context_window > 32000 THEN
              'Great balance: Good context window with competitive pricing'
            WHEN context_window > 32000 THEN
              'Solid choice: Good context window for most tasks'
            WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.01 THEN
              'Budget-friendly: Low cost with adequate capabilities'
            ELSE
              'Basic option: Suitable for simple tasks'
          END ||
          CASE WHEN supports_functions THEN ' • Function calling support' ELSE '' END ||
          CASE WHEN supports_vision AND requirements::text LIKE '%vision%' THEN ' • Vision capabilities for image processing' ELSE '' END
        ),
        'has_key', EXISTS(
          SELECT 1 FROM ai_api_keys
          WHERE ai_api_keys.provider_name = ai_llm_providers.provider_name
          AND ai_api_keys.is_active = true
        )
      ) as scored_model,
      (
        CASE
          WHEN context_window > 128000 THEN 35
          WHEN context_window > 100000 THEN 30
          WHEN context_window > 32000 THEN 25
          WHEN context_window > 16000 THEN 20
          WHEN context_window > 8000 THEN 15
          ELSE 10
        END +
        CASE WHEN supports_functions = true THEN 15 ELSE 0 END +
        CASE WHEN supports_vision = true AND requirements::text LIKE '%vision%' THEN 15 ELSE 0 END +
        CASE
          WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.001 THEN 25
          WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.005 THEN 20
          WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.01 THEN 15
          WHEN (input_price_per_1k_tokens + output_price_per_1k_tokens) < 0.02 THEN 10
          ELSE 5
        END +
        CASE
          WHEN requirements->>'complexity' = 'high' THEN
            CASE
              WHEN context_window > 100000 THEN 10
              WHEN context_window > 32000 THEN 5
              ELSE -5
            END
          WHEN requirements->>'complexity' = 'medium' THEN 5
          ELSE 0
        END +
        CASE
          WHEN EXISTS(
            SELECT 1 FROM ai_api_keys
            WHERE ai_api_keys.provider_name = ai_llm_providers.provider_name
            AND ai_api_keys.is_active = true
          ) THEN 5
          ELSE 0
        END
      ) as final_score
    FROM ai_llm_providers
    WHERE is_active = true
  ) ranked;

  recommendation := jsonb_build_object(
    'feature_name', p_feature_name,
    'available_providers', COALESCE(available_providers, '[]'::jsonb),
    'all_providers', COALESCE(all_providers, '[]'::jsonb),
    'requirements', requirements,
    'generated_at', now()
  );

  UPDATE ai_feature_llm_mappings
  SET
    last_recommendation_at = now(),
    alternative_recommendations = all_providers
  WHERE feature_name = p_feature_name;

  RETURN recommendation;
END;
$$;

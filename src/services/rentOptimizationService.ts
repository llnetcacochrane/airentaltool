import { supabase } from '../lib/supabase';
import { aiService } from './aiService';

export interface RentRecommendation {
  property_id: string;
  property_name: string;
  current_rent: number;
  recommended_rent: number;
  adjustment_percentage: number;
  confidence_score: number;
  reasoning: string[];
  market_factors: {
    occupancy_trend: string;
    payment_reliability: string;
    maintenance_costs: string;
    market_position: string;
  };
  potential_annual_increase: number;
  ai_insights?: string;
  market_context?: string;
}

export const rentOptimizationService = {
  async analyzeProperty(propertyId: string, organizationId: string): Promise<RentRecommendation | null> {
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .single();

    if (!property) return null;

    // Get all units for this property first
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .eq('property_id', propertyId);

    const unitIds = units?.map(u => u.id) || [];

    // Get leases for those units
    const { data: leases } = unitIds.length > 0 ? await supabase
      .from('leases')
      .select(`
        *,
        tenants(*),
        payment_schedules(*)
      `)
      .in('unit_id', unitIds)
      .eq('organization_id', organizationId) : { data: [] };

    const { data: maintenance } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyId)
      .eq('organization_id', organizationId);

    const activeLeases = leases?.filter(l => l.status === 'active') || [];
    const currentRent = activeLeases.length > 0 ? activeLeases[0].monthly_rent : 0;

    if (currentRent === 0) return null;

    const allSchedules = activeLeases.flatMap(l => l.payment_schedules || []);
    const paidOnTime = allSchedules.filter((s: any) => {
      if (!s.is_paid || !s.paid_date) return false;
      const dueDate = new Date(s.payment_date);
      const paidDate = new Date(s.paid_date);
      return paidDate <= dueDate;
    }).length;
    const paymentReliability = allSchedules.length > 0 ? (paidOnTime / allSchedules.length) * 100 : 100;

    const maintenanceCosts = maintenance?.reduce((sum, m) => sum + (m.actual_cost || m.estimated_cost || 0), 0) || 0;
    const monthlyMaintenanceCost = maintenanceCosts / 12;
    const maintenanceCostRatio = currentRent > 0 ? (monthlyMaintenanceCost / currentRent) * 100 : 0;

    const totalUnits = property.total_units || 1;
    const occupiedUnits = activeLeases.length;
    const occupancyRate = (occupiedUnits / totalUnits) * 100;

    let adjustmentPercentage = 0;
    let confidence = 85;
    const reasoning: string[] = [];
    const marketFactors = {
      occupancy_trend: '',
      payment_reliability: '',
      maintenance_costs: '',
      market_position: '',
    };

    if (occupancyRate >= 95) {
      adjustmentPercentage += 5;
      reasoning.push('High occupancy (95%+) indicates strong demand - rent can be increased');
      marketFactors.occupancy_trend = 'Strong demand';
    } else if (occupancyRate >= 85) {
      adjustmentPercentage += 2;
      reasoning.push('Good occupancy (85-95%) supports moderate rent increase');
      marketFactors.occupancy_trend = 'Healthy demand';
    } else if (occupancyRate < 70) {
      adjustmentPercentage -= 3;
      reasoning.push('Low occupancy suggests rent may be too high - consider reduction');
      marketFactors.occupancy_trend = 'Weak demand';
      confidence -= 10;
    } else {
      marketFactors.occupancy_trend = 'Average demand';
    }

    if (paymentReliability >= 95) {
      adjustmentPercentage += 2;
      reasoning.push('Excellent payment history (95%+ on-time) - tenants can afford increase');
      marketFactors.payment_reliability = 'Excellent';
    } else if (paymentReliability >= 85) {
      adjustmentPercentage += 1;
      reasoning.push('Good payment reliability supports modest increase');
      marketFactors.payment_reliability = 'Good';
    } else if (paymentReliability < 75) {
      adjustmentPercentage -= 2;
      reasoning.push('Poor payment history indicates rent may already be at tenant limit');
      marketFactors.payment_reliability = 'Poor';
      confidence -= 15;
    } else {
      marketFactors.payment_reliability = 'Fair';
    }

    if (maintenanceCostRatio > 15) {
      adjustmentPercentage -= 1;
      reasoning.push('High maintenance costs (>15% of rent) - increase carefully');
      marketFactors.maintenance_costs = 'High';
      confidence -= 5;
    } else if (maintenanceCostRatio < 5) {
      adjustmentPercentage += 1;
      reasoning.push('Low maintenance costs provide room for competitive pricing');
      marketFactors.maintenance_costs = 'Low';
    } else {
      marketFactors.maintenance_costs = 'Average';
    }

    const leaseAge = activeLeases[0] ?
      Math.floor((Date.now() - new Date(activeLeases[0].start_date).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;

    if (leaseAge >= 2) {
      adjustmentPercentage += 3;
      reasoning.push(`Lease is ${leaseAge} years old - market rates likely increased 2-3% annually`);
    }

    const inflationRate = 2.5;
    adjustmentPercentage += inflationRate;
    reasoning.push(`Annual inflation adjustment: ${inflationRate}%`);

    adjustmentPercentage = Math.max(-5, Math.min(15, adjustmentPercentage));

    if (property.bedrooms && property.bedrooms >= 3) {
      marketFactors.market_position = 'Family-sized unit - strong market';
      confidence += 5;
    } else if (property.bedrooms === 1) {
      marketFactors.market_position = 'Studio/1BR - price-sensitive market';
      confidence -= 5;
    } else {
      marketFactors.market_position = 'Standard market positioning';
    }

    const recommendedRent = Math.round(currentRent * (1 + adjustmentPercentage / 100));
    const potentialAnnualIncrease = (recommendedRent - currentRent) * 12;

    if (adjustmentPercentage === 0) {
      reasoning.push('Current rent is well-optimized for market conditions');
    }

    const recommendation: RentRecommendation = {
      property_id: propertyId,
      property_name: property.name,
      current_rent: currentRent,
      recommended_rent: recommendedRent,
      adjustment_percentage: Math.round(adjustmentPercentage * 10) / 10,
      confidence_score: Math.min(100, confidence),
      reasoning,
      market_factors: marketFactors,
      potential_annual_increase: potentialAnnualIncrease,
    };

    try {
      const aiInsights = await this.generateAIInsights(recommendation, property, organizationId);
      recommendation.ai_insights = aiInsights.insights;
      recommendation.market_context = aiInsights.marketContext;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    }

    return recommendation;
  },

  async generateAIInsights(
    recommendation: RentRecommendation,
    property: any,
    organizationId: string
  ): Promise<{ insights: string; marketContext: string }> {
    const systemPrompt = `You are a property management and real estate pricing expert. Provide clear, actionable insights on rental pricing strategies.`;

    const userPrompt = `Analyze this rental property and provide insights:

Property: ${property.name}
Location: ${property.address_line1 || 'N/A'}
Bedrooms: ${property.bedrooms || 'N/A'}
Bathrooms: ${property.bathrooms || 'N/A'}
Square Feet: ${property.square_feet || 'N/A'}

Current Rent: $${recommendation.current_rent}
Recommended Rent: $${recommendation.recommended_rent}
Adjustment: ${recommendation.adjustment_percentage}%

Market Factors:
- Occupancy: ${recommendation.market_factors.occupancy_trend}
- Payment Reliability: ${recommendation.market_factors.payment_reliability}
- Maintenance Costs: ${recommendation.market_factors.maintenance_costs}
- Market Position: ${recommendation.market_factors.market_position}

Data-Driven Reasoning:
${recommendation.reasoning.map(r => `- ${r}`).join('\n')}

Provide your analysis in this exact JSON format:
{
  "insights": "<2-3 sentence executive summary explaining the recommendation in plain English>",
  "marketContext": "<1-2 sentences about general market conditions and timing considerations>"
}`;

    const response = await aiService.generateForFeature('rent_optimization', {
      prompt: userPrompt,
      systemPrompt,
      max_tokens: 300,
      temperature: 0.7,
    });

    const parsed = JSON.parse(response.text);
    return {
      insights: parsed.insights,
      marketContext: parsed.marketContext,
    };
  },

  async analyzeAllProperties(organizationId: string): Promise<RentRecommendation[]> {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organizationId);

    if (!properties) return [];

    const recommendations: RentRecommendation[] = [];

    for (const property of properties) {
      const recommendation = await this.analyzeProperty(property.id, organizationId);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations.sort((a, b) => Math.abs(b.adjustment_percentage) - Math.abs(a.adjustment_percentage));
  },
};

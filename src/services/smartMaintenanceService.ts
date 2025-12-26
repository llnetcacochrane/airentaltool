import { supabase } from '../lib/supabase';
import { aiService } from './aiService';
import { MaintenanceRequest, MaintenanceVendor } from './maintenanceService';

export interface VendorMatch {
  vendor: MaintenanceVendor;
  matchScore: number;
  reasons: string[];
  estimatedResponseTime: string;
}

export interface CostEstimate {
  estimatedCost: number;
  costRange: {
    min: number;
    max: number;
  };
  confidence: number;
  reasoning: string;
  breakdown?: string[];
}

export interface MaintenanceInsights {
  urgencyAssessment: string;
  suggestedPriority: 'emergency' | 'high' | 'medium' | 'low';
  potentialIssues: string[];
  preventiveMeasures: string[];
}

export const smartMaintenanceService = {
  async matchVendors(
    request: MaintenanceRequest,
    vendors: MaintenanceVendor[]
  ): Promise<VendorMatch[]> {
    const matches: VendorMatch[] = [];

    for (const vendor of vendors) {
      const reasons: string[] = [];
      let score = 0;

      const specialtyMatch = this.calculateSpecialtyMatch(request.category, vendor.specialty);
      score += specialtyMatch.score;
      if (specialtyMatch.reason) reasons.push(specialtyMatch.reason);

      const ratingScore = (vendor.rating / 5) * 30;
      score += ratingScore;
      if (vendor.rating >= 4.5) {
        reasons.push(`Excellent rating of ${vendor.rating}/5`);
      } else if (vendor.rating >= 4.0) {
        reasons.push(`Good rating of ${vendor.rating}/5`);
      }

      const experienceScore = Math.min((vendor.total_jobs / 10) * 20, 20);
      score += experienceScore;
      if (vendor.total_jobs >= 20) {
        reasons.push(`Highly experienced (${vendor.total_jobs} completed jobs)`);
      } else if (vendor.total_jobs >= 10) {
        reasons.push(`Experienced (${vendor.total_jobs} completed jobs)`);
      }

      if (request.priority === 'emergency' && vendor.total_jobs >= 15) {
        score += 10;
        reasons.push('Reliable for emergency repairs');
      }

      const estimatedResponseTime = this.estimateResponseTime(vendor, request.priority);

      matches.push({
        vendor,
        matchScore: Math.round(score),
        reasons,
        estimatedResponseTime,
      });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  },

  calculateSpecialtyMatch(category: string, specialty: string): { score: number; reason?: string } {
    const categoryLower = category.toLowerCase();
    const specialtyLower = specialty.toLowerCase();

    if (specialtyLower.includes(categoryLower) || categoryLower.includes(specialtyLower)) {
      return { score: 40, reason: `Perfect match for ${category} work` };
    }

    const categoryMap: Record<string, string[]> = {
      plumbing: ['water', 'drain', 'pipe', 'leak', 'faucet', 'toilet'],
      electrical: ['electric', 'wiring', 'outlet', 'light', 'breaker', 'power'],
      hvac: ['heating', 'cooling', 'air', 'furnace', 'ac', 'ventilation'],
      appliance: ['appliances', 'refrigerator', 'stove', 'washer', 'dryer', 'dishwasher'],
      general: ['handyman', 'general', 'maintenance', 'repair'],
    };

    for (const [key, keywords] of Object.entries(categoryMap)) {
      const categoryMatch = keywords.some(k => categoryLower.includes(k));
      const specialtyMatch = keywords.some(k => specialtyLower.includes(k));

      if (categoryMatch && specialtyMatch) {
        return { score: 35, reason: `Good match for ${category} work` };
      }
    }

    if (specialtyLower.includes('general') || specialtyLower.includes('handyman')) {
      return { score: 20, reason: 'General contractor can handle most tasks' };
    }

    return { score: 10 };
  },

  estimateResponseTime(vendor: MaintenanceVendor, priority: string): string {
    const baseHours: Record<string, number> = {
      emergency: 2,
      high: 24,
      medium: 72,
      low: 120,
    };

    const hours = baseHours[priority] || 48;

    if (vendor.rating >= 4.5 && vendor.total_jobs >= 20) {
      const adjustedHours = Math.max(hours * 0.7, 1);
      return this.formatHours(adjustedHours);
    } else if (vendor.rating >= 4.0) {
      return this.formatHours(hours);
    } else {
      const adjustedHours = hours * 1.3;
      return this.formatHours(adjustedHours);
    }
  },

  formatHours(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${Math.round(hours)} hours`;
    } else {
      const days = Math.round(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  },

  async estimateCostWithAI(
    request: MaintenanceRequest,
    organizationId: string
  ): Promise<CostEstimate> {
    try {
      const historicalData = await this.getHistoricalCosts(organizationId, request.category);

      const systemPrompt = `You are an expert in property maintenance cost estimation. Analyze maintenance requests and provide realistic cost estimates based on the description, category, and priority.`;

      const userPrompt = `Please estimate the cost for this maintenance request:

Category: ${request.category}
Priority: ${request.priority}
Title: ${request.title}
Description: ${request.description}

${historicalData.length > 0 ? `Historical costs for similar ${request.category} work at this organization: ${historicalData.map(h => `$${h}`).join(', ')}` : ''}

Provide your response in this exact JSON format:
{
  "estimatedCost": <number>,
  "minCost": <number>,
  "maxCost": <number>,
  "confidence": <number 0-100>,
  "reasoning": "<brief explanation>",
  "breakdown": ["<item 1>", "<item 2>", ...]
}`;

      const response = await aiService.generateForFeature('maintenance_categorization', {
        prompt: userPrompt,
        systemPrompt,
        max_tokens: 500,
        temperature: 0.3,
      });

      const parsed = JSON.parse(response.text);

      return {
        estimatedCost: parsed.estimatedCost,
        costRange: {
          min: parsed.minCost,
          max: parsed.maxCost,
        },
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        breakdown: parsed.breakdown,
      };
    } catch (error) {
      console.error('AI cost estimation failed, using fallback:', error);
      return this.estimateCostFallback(request);
    }
  },

  async getHistoricalCosts(organizationId: string, category: string): Promise<number[]> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('actual_cost')
      .eq('organization_id', organizationId)
      .eq('category', category)
      .not('actual_cost', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error || !data) return [];
    return data.map(r => r.actual_cost).filter(Boolean);
  },

  estimateCostFallback(request: MaintenanceRequest): CostEstimate {
    const baseCosts: Record<string, number> = {
      plumbing: 250,
      electrical: 300,
      hvac: 400,
      appliance: 200,
      general: 150,
      painting: 300,
      flooring: 500,
      roofing: 800,
      other: 200,
    };

    const priorityMultipliers: Record<string, number> = {
      emergency: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.9,
    };

    const baseCost = baseCosts[request.category.toLowerCase()] || baseCosts.other;
    const multiplier = priorityMultipliers[request.priority] || 1.0;
    const estimatedCost = baseCost * multiplier;

    return {
      estimatedCost,
      costRange: {
        min: Math.round(estimatedCost * 0.7),
        max: Math.round(estimatedCost * 1.3),
      },
      confidence: 60,
      reasoning: 'Estimate based on typical costs for this category and priority level',
      breakdown: [
        `Base ${request.category} service cost`,
        `${request.priority} priority adjustment`,
      ],
    };
  },

  async analyzeRequestWithAI(
    request: MaintenanceRequest,
    organizationId: string
  ): Promise<MaintenanceInsights> {
    try {
      const systemPrompt = `You are a property maintenance expert. Analyze maintenance requests to assess urgency, identify potential issues, and suggest preventive measures.`;

      const userPrompt = `Analyze this maintenance request:

Category: ${request.category}
Current Priority: ${request.priority}
Title: ${request.title}
Description: ${request.description}

Provide your analysis in this exact JSON format:
{
  "urgencyAssessment": "<brief assessment of true urgency>",
  "suggestedPriority": "<emergency|high|medium|low>",
  "potentialIssues": ["<issue 1>", "<issue 2>", ...],
  "preventiveMeasures": ["<measure 1>", "<measure 2>", ...]
}`;

      const response = await aiService.generateForFeature('maintenance_categorization', {
        prompt: userPrompt,
        systemPrompt,
        max_tokens: 400,
        temperature: 0.4,
      });

      const parsed = JSON.parse(response.text);

      return {
        urgencyAssessment: parsed.urgencyAssessment,
        suggestedPriority: parsed.suggestedPriority,
        potentialIssues: parsed.potentialIssues,
        preventiveMeasures: parsed.preventiveMeasures,
      };
    } catch (error) {
      console.error('AI maintenance analysis failed:', error);
      return {
        urgencyAssessment: 'Unable to analyze at this time',
        suggestedPriority: request.priority,
        potentialIssues: [],
        preventiveMeasures: [],
      };
    }
  },

  async getRecommendedVendor(
    requestId: string,
    organizationId: string
  ): Promise<VendorMatch | null> {
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) return null;

    const { data: vendors, error: vendorsError } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (vendorsError || !vendors || vendors.length === 0) return null;

    const matches = await this.matchVendors(request, vendors);
    return matches.length > 0 ? matches[0] : null;
  },
};

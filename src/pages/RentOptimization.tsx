import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { rentOptimizationService, RentRecommendation } from '../services/rentOptimizationService';
import { TrendingUp, TrendingDown, Minus, Sparkles, DollarSign, Target, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SlidePanel } from '../components/SlidePanel';

export function RentOptimization() {
  const { currentBusiness } = useAuth();
  const [recommendations, setRecommendations] = useState<RentRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<RentRecommendation | null>(null);

  useEffect(() => {
    if (currentBusiness) {
      loadRecommendations();
    }
  }, [currentBusiness]);

  const loadRecommendations = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const data = await rentOptimizationService.analyzeAllProperties(currentBusiness.id);
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load rent recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (percentage < 0) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getTrendColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const totalPotentialIncrease = recommendations.reduce((sum, r) => sum + r.potential_annual_increase, 0);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">AI Rent Optimization</h1>
                <p className="text-blue-100 mt-1">Data-driven rent recommendations for maximum revenue</p>
              </div>
            </div>
            {recommendations.length > 0 && (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-white">
                <div className="text-sm text-blue-100 mb-1">Potential Annual Increase</div>
                <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalPotentialIncrease)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations available</h3>
            <p className="text-gray-600">
              Add properties with active leases and payment history to get AI-powered rent recommendations
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {recommendations.map((rec) => (
              <div
                key={rec.property_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => setSelectedProperty(rec)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{rec.property_name}</h3>
                      <div className="flex items-center gap-4 sm:gap-6 text-sm">
                        <div>
                          <span className="text-gray-600">Current Rent:</span>
                          <span className="ml-2 font-semibold text-gray-900">{formatCurrency(rec.current_rent)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Recommended:</span>
                          <span className="ml-2 font-semibold text-blue-600">{formatCurrency(rec.recommended_rent)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        {getTrendIcon(rec.adjustment_percentage)}
                        <span className={`text-2xl sm:text-3xl font-bold ${getTrendColor(rec.adjustment_percentage)}`}>
                          {rec.adjustment_percentage > 0 ? '+' : ''}{rec.adjustment_percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Target size={14} />
                        <span>{rec.confidence_score}% confidence</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Annual Revenue Impact</div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
                          {rec.potential_annual_increase >= 0 ? '+' : ''}{formatCurrency(rec.potential_annual_increase)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">Occupancy</div>
                      <div className="text-sm font-semibold text-gray-900">{rec.market_factors.occupancy_trend}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">Payments</div>
                      <div className="text-sm font-semibold text-gray-900">{rec.market_factors.payment_reliability}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">Maintenance</div>
                      <div className="text-sm font-semibold text-gray-900">{rec.market_factors.maintenance_costs}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">Market</div>
                      <div className="text-sm font-semibold text-gray-900">{rec.market_factors.market_position}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">AI Analysis:</div>
                    <ul className="space-y-1">
                      {rec.reasoning.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                    {rec.reasoning.length > 3 && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                        View all {rec.reasoning.length} factors →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">How to Use These Recommendations</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Review tenant lease end dates before implementing increases</li>
                  <li>• Consider local rent control regulations in your area</li>
                  <li>• Communicate changes to tenants with proper notice (typically 60-90 days)</li>
                  <li>• Monitor market conditions and adjust recommendations quarterly</li>
                  <li>• Higher confidence scores indicate more reliable recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProperty && (
        <PropertyDetailModal
          recommendation={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

function PropertyDetailModal({
  recommendation,
  onClose,
}: {
  recommendation: RentRecommendation;
  onClose: () => void;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <SlidePanel
      isOpen={true}
      onClose={onClose}
      title={recommendation.property_name}
      size="large"
      footer={
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Close
        </button>
      }
    >
      <div className="space-y-6">
        <p className="text-gray-600">Detailed rent optimization analysis</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Current Monthly Rent</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(recommendation.current_rent)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Recommended Monthly Rent</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(recommendation.recommended_rent)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-gray-700 mb-1">Potential Annual Revenue Increase</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-700">
            {recommendation.potential_annual_increase >= 0 ? '+' : ''}{formatCurrency(recommendation.potential_annual_increase)}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Market Factors Analysis</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Occupancy Trend</div>
              <div className="font-semibold text-gray-900">{recommendation.market_factors.occupancy_trend}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Payment Reliability</div>
              <div className="font-semibold text-gray-900">{recommendation.market_factors.payment_reliability}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Maintenance Costs</div>
              <div className="font-semibold text-gray-900">{recommendation.market_factors.maintenance_costs}</div>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Market Position</div>
              <div className="font-semibold text-gray-900">{recommendation.market_factors.market_position}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Complete AI Analysis</h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Target size={14} />
              <span>{recommendation.confidence_score}% confidence</span>
            </div>
          </div>
          <ul className="space-y-2">
            {recommendation.reasoning.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SlidePanel>
  );
}

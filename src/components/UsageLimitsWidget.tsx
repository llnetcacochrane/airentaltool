import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { packageTierService, PackageTier } from '../services/packageTierService';
import {
  Building2,
  Users,
  DoorClosed,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Crown
} from 'lucide-react';

interface UsageLimitsWidgetProps {
  compact?: boolean;
}

interface UsageData {
  current_usage: {
    businesses: number;
    properties: number;
    units: number;
    tenants: number;
    users: number;
  };
  limits: {
    max_businesses: number;
    max_properties: number;
    max_units: number;
    max_tenants: number;
    max_users: number;
  };
  tier: PackageTier | null;
}

export function UsageLimitsWidget({ compact = false }: UsageLimitsWidgetProps) {
  const { currentBusiness, packageTier } = useAuth();
  const navigate = useNavigate();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [currentBusiness?.id, packageTier]);

  const loadUsageData = async () => {
    if (!currentBusiness?.id) return;

    try {
      // Use user-based limits, not organization-based
      const limitData = await packageTierService.checkPackageLimits(currentBusiness.id);

      setUsageData({
        current_usage: limitData.current_usage,
        limits: limitData.limits,
        tier: packageTier,
      });
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getUsagePercentage = (current: number, max: number): number => {
    if (max === 999999) return 0; // Unlimited
    if (max === 0) return 100;
    return Math.round((current / max) * 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageTextColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    return 'text-gray-600';
  };

  const formatLimit = (value: number): string => {
    if (value === 999999) return 'Unlimited';
    return value.toString();
  };

  const isFreeTier = !usageData?.tier || usageData.tier.tier_slug === 'free';
  const hasLimitsReached = usageData && Object.entries(usageData.current_usage).some(([key, value]) => {
    const limitKey = `max_${key}` as keyof typeof usageData.limits;
    const limit = usageData.limits[limitKey];
    return limit !== 999999 && value >= limit;
  });

  const hasLimitsApproaching = usageData && Object.entries(usageData.current_usage).some(([key, value]) => {
    const limitKey = `max_${key}` as keyof typeof usageData.limits;
    const limit = usageData.limits[limitKey];
    return limit !== 999999 && getUsagePercentage(value, limit) >= 80;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!usageData) return null;

  const usageItems = [
    {
      key: 'properties',
      label: 'Properties',
      icon: Building2,
      current: usageData.current_usage.properties,
      max: usageData.limits.max_properties
    },
    {
      key: 'units',
      label: 'Units',
      icon: DoorClosed,
      current: usageData.current_usage.units,
      max: usageData.limits.max_units
    },
    {
      key: 'tenants',
      label: 'Tenants',
      icon: Users,
      current: usageData.current_usage.tenants,
      max: usageData.limits.max_tenants
    },
  ];

  // Add businesses for management company tier
  if (usageData.tier?.package_type === 'management_company') {
    usageItems.unshift({
      key: 'businesses',
      label: 'Businesses',
      icon: Briefcase,
      current: usageData.current_usage.businesses,
      max: usageData.limits.max_businesses
    });
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Usage</span>
            {usageData.tier && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                {usageData.tier.display_name}
              </span>
            )}
          </div>
          {(hasLimitsReached || hasLimitsApproaching) && (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
        </div>
        <div className="space-y-2">
          {usageItems.map((item) => {
            const percentage = getUsagePercentage(item.current, item.max);
            return (
              <div key={item.key} className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={getUsageTextColor(percentage)}>
                      {item.current}/{formatLimit(item.max)}
                    </span>
                  </div>
                  {item.max !== 999999 && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getUsageColor(percentage)} transition-all`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {isFreeTier && (
          <button
            onClick={() => navigate('/settings')}
            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade Plan
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Plan Usage</h3>
              {usageData.tier && (
                <p className="text-sm text-gray-600">
                  {usageData.tier.display_name}
                  {isFreeTier && <span className="text-gray-400"> - Free tier</span>}
                </p>
              )}
            </div>
          </div>
          {hasLimitsReached && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Limit reached
            </div>
          )}
          {!hasLimitsReached && hasLimitsApproaching && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Approaching limit
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {usageItems.map((item) => {
            const percentage = getUsagePercentage(item.current, item.max);
            const Icon = item.icon;
            const isAtLimit = item.max !== 999999 && percentage >= 100;
            const isApproaching = item.max !== 999999 && percentage >= 80 && percentage < 100;

            return (
              <div
                key={item.key}
                className={`p-4 rounded-lg border-2 ${
                  isAtLimit ? 'border-red-200 bg-red-50' :
                  isApproaching ? 'border-orange-200 bg-orange-50' :
                  'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    isAtLimit ? 'bg-red-100' :
                    isApproaching ? 'bg-orange-100' :
                    'bg-white'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isAtLimit ? 'text-red-600' :
                      isApproaching ? 'text-orange-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className={`text-lg font-bold ${getUsageTextColor(percentage)}`}>
                      {item.current} <span className="text-sm font-normal text-gray-500">/ {formatLimit(item.max)}</span>
                    </p>
                  </div>
                </div>

                {item.max !== 999999 && (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUsageColor(percentage)} transition-all`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                )}
                {item.max === 999999 && (
                  <div className="text-xs text-green-600 font-medium">Unlimited</div>
                )}
              </div>
            );
          })}
        </div>

        {isFreeTier && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-300" />
                  <h4 className="font-bold text-lg">Upgrade Your Plan</h4>
                </div>
                <p className="text-blue-100 text-sm mb-4">
                  Unlock more properties, units, and tenants. Get advanced features like reporting, analytics, and priority support.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/settings')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
                  >
                    View Plans
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate('/addons')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition"
                  >
                    Buy Add-Ons
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <Sparkles className="w-16 h-16 text-blue-400 opacity-50" />
            </div>
          </div>
        )}

        {!isFreeTier && (hasLimitsReached || hasLimitsApproaching) && (
          <div className={`rounded-lg p-4 ${hasLimitsReached ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasLimitsReached ? 'text-red-600' : 'text-orange-600'}`} />
              <div className="flex-1">
                <h4 className={`font-semibold ${hasLimitsReached ? 'text-red-800' : 'text-orange-800'}`}>
                  {hasLimitsReached ? 'You\'ve reached your plan limits' : 'You\'re approaching your plan limits'}
                </h4>
                <p className={`text-sm mt-1 ${hasLimitsReached ? 'text-red-700' : 'text-orange-700'}`}>
                  {hasLimitsReached
                    ? 'Upgrade your plan or purchase add-ons to continue adding resources.'
                    : 'Consider upgrading soon to avoid interruptions.'}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate('/settings')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      hasLimitsReached
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    } transition`}
                  >
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() => navigate('/addons')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      hasLimitsReached
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    } transition`}
                  >
                    Buy Add-Ons
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

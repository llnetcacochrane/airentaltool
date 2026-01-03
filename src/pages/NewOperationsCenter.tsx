import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { financialService } from '../services/financialService';
import { portfolioHealthService, PortfolioHealth } from '../services/portfolioHealthService';
import { paymentPredictionService, PaymentRiskScore } from '../services/paymentPredictionService';
import { leaseRenewalService, LeaseRenewalOpportunity } from '../services/leaseRenewalService';
import {
  TrendingUp, DollarSign, Wrench, Calendar, Users, Home, Building2,
  AlertTriangle, CheckCircle2, ArrowRight, Zap, Bell, Clock,
  Target, Award, Sparkles, ChevronRight, TrendingDown, BarChart3,
  Briefcase, DoorClosed
} from 'lucide-react';
import { MetricCard, MetricCardSkeleton } from '../components/analytics/MetricCard';
import { HealthScoreRing, ProgressRing } from '../components/analytics/ProgressRing';
import { ChartCard } from '../components/analytics/ChartCard';
import { UpgradeCard, FeatureLocked } from '../components/upsell/UpgradeCard';
import { Tooltip, FeatureHint } from '../components/ui/Tooltip';
import { DashboardOnboarding } from '../components/DashboardOnboarding';
import { UsageLimitsWidget } from '../components/UsageLimitsWidget';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'lease' | 'payment' | 'maintenance' | 'document' | 'opportunity';
  title: string;
  description: string;
  actionUrl: string;
  actionText?: string;
  dueDate?: string;
  value?: string;
}

export function NewOperationsCenter() {
  const { currentBusiness, userProfile, packageType, isLandlord, isPropertyManager } = useAuth();
  const navigate = useNavigate();

  const [portfolioHealth, setPortfolioHealth] = useState<PortfolioHealth | null>(null);
  const [riskScores, setRiskScores] = useState<PaymentRiskScore[]>([]);
  const [renewalOpportunities, setRenewalOpportunities] = useState<LeaseRenewalOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const userTier = userProfile?.selected_tier || 'free';
  const isFree = userTier === 'free';
  const isPro = ['professional', 'management-company'].includes(userTier);

  useEffect(() => {
    loadOperationsData();
  }, [currentBusiness?.id]);

  const loadOperationsData = async () => {
    const orgId = currentBusiness?.id;
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [healthData, riskData, renewalData, summaryData] = await Promise.all([
        portfolioHealthService.calculateHealthScore(orgId),
        paymentPredictionService.calculateTenantRiskScores(orgId),
        leaseRenewalService.getExpiringLeases(orgId, 90),
        financialService.getPortfolioSummary(orgId),
      ]);

      setPortfolioHealth(healthData);
      setRiskScores(riskData.filter(r => r.risk_level !== 'low'));
      setRenewalOpportunities(renewalData);
      setFinancialSummary(summaryData);

      // Generate comprehensive alerts
      const generatedAlerts: Alert[] = [];

      // Lease expiry alerts
      renewalData.slice(0, 5).forEach((renewal) => {
        const daysUntil = renewal.days_until_expiry;
        generatedAlerts.push({
          id: `lease-${renewal.tenant_id}`,
          type: daysUntil <= 30 ? 'critical' : 'warning',
          category: 'lease',
          title: daysUntil <= 30 ? 'Urgent: Lease Expiring Soon' : 'Lease Renewal Opportunity',
          description: `${renewal.tenant_name} at ${renewal.unit_number} - ${daysUntil} days remaining`,
          actionUrl: `/tenants`,
          actionText: 'Review Lease',
          dueDate: renewal.lease_end_date,
        });
      });

      // Payment risk alerts
      riskData.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').slice(0, 5).forEach((risk) => {
        generatedAlerts.push({
          id: `payment-${risk.tenant_id}`,
          type: risk.risk_level === 'critical' ? 'critical' : 'warning',
          category: 'payment',
          title: `Payment Risk: ${risk.risk_level.toUpperCase()}`,
          description: `${risk.tenant_name} at ${risk.unit_number} - ${risk.risk_score}% risk probability`,
          actionUrl: `/tenants`,
          actionText: 'Contact Tenant',
        });
      });

      // Revenue opportunity alerts (for Pro users)
      if (isPro && healthData && healthData.occupancy_rate > 90) {
        generatedAlerts.push({
          id: 'opportunity-rent',
          type: 'success',
          category: 'opportunity',
          title: 'Revenue Opportunity Detected',
          description: 'High occupancy rate suggests potential for rent increases. Run AI rent optimization.',
          actionUrl: '/rent-optimization',
          actionText: 'Analyze Rates',
          value: 'Potential: +15% revenue'
        });
      }

      setAlerts(generatedAlerts.sort((a, b) => {
        const priority = { critical: 4, warning: 3, success: 2, info: 1 };
        return priority[b.type] - priority[a.type];
      }));

    } catch (err) {
      console.error('Failed to load operations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertConfig = (type: string) => {
    const configs = {
      critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600' },
      warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
      success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600' }
    };
    return configs[type as keyof typeof configs] || configs.info;
  };

  const getAlertIcon = (category: string) => {
    const icons = {
      lease: Calendar,
      payment: DollarSign,
      maintenance: Wrench,
      document: Bell,
      opportunity: Sparkles
    };
    return icons[category as keyof typeof icons] || Bell;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCardSkeleton count={4} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
            <div className="h-96 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-1">
                {isLandlord ? 'Portfolio Dashboard' : 'Operations Center'}
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <span>{currentBusiness?.name || currentBusiness?.business_name || 'My Business'}</span>
                {portfolioHealth && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="font-semibold text-blue-600">
                      Health Score: {portfolioHealth.health_score}/100
                    </span>
                  </>
                )}
              </p>
            </div>

            {alerts.filter(a => a.type === 'critical' || a.type === 'warning').length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-sm font-bold text-red-900">
                    {alerts.filter(a => a.type === 'critical' || a.type === 'warning').length} Items Need Attention
                  </div>
                  <div className="text-xs text-red-700">Review alerts below</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Smart Onboarding */}
        <DashboardOnboarding />

        {/* Package Usage Limits */}
        <UsageLimitsWidget />

        {/* Key Metrics Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Key Performance Metrics
            </h2>
            <Tooltip content="Real-time metrics updated automatically from your portfolio data">
              <button className="text-sm text-gray-600 hover:text-gray-900 transition">
                What are these?
              </button>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Monthly Revenue"
              value={financialSummary?.total_revenue ? `$${(financialSummary.total_revenue / 100).toLocaleString()}` : '$0'}
              icon={DollarSign}
              color="green"
              trend={{
                value: '15%',
                isPositive: true,
                label: 'vs last month'
              }}
              subtitle="Total rental income"
            />

            <MetricCard
              title="Collection Rate"
              value={portfolioHealth?.collection_rate ? `${portfolioHealth.collection_rate}%` : '0%'}
              icon={CheckCircle2}
              color="blue"
              trend={{
                value: '3%',
                isPositive: true,
                label: 'improvement'
              }}
              subtitle="On-time payments"
            />

            <MetricCard
              title="Occupancy Rate"
              value={portfolioHealth?.occupancy_rate ? `${portfolioHealth.occupancy_rate}%` : '0%'}
              icon={Home}
              color="purple"
              subtitle="Units occupied"
              badge={portfolioHealth?.occupancy_rate && portfolioHealth.occupancy_rate > 90 ? 'HIGH' : undefined}
            />

            <MetricCard
              title="Active Tenants"
              value={financialSummary?.total_tenants || 0}
              icon={Users}
              color="amber"
              subtitle="Current residents"
              action={{
                label: 'View all',
                onClick: () => navigate('/tenants')
              }}
            />
          </div>
        </div>

        {/* Portfolio Health Score - Prominent Display */}
        {portfolioHealth && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-yellow-300" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Portfolio Health Overview</h2>
                  <p className="text-blue-100">AI-powered insights into your portfolio performance</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
                {/* Health Score Ring */}
                <div className="lg:col-span-1 flex items-center justify-center">
                  <HealthScoreRing score={portfolioHealth.health_score} />
                </div>

                {/* Individual metrics */}
                <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="mb-3">
                      <ProgressRing
                        value={portfolioHealth.occupancy_rate}
                        size={100}
                        strokeWidth={8}
                        color="#10B981"
                        showValue={false}
                        label="Occupancy"
                      />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{portfolioHealth.occupancy_rate}%</div>
                    <div className="text-sm text-gray-600">Occupancy</div>
                  </div>

                  <div className="text-center">
                    <div className="mb-3">
                      <ProgressRing
                        value={portfolioHealth.collection_rate}
                        size={100}
                        strokeWidth={8}
                        color="#3B82F6"
                        showValue={false}
                        label="Collection"
                      />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{portfolioHealth.collection_rate}%</div>
                    <div className="text-sm text-gray-600">Collection</div>
                  </div>

                  <div className="text-center">
                    <div className="mb-3">
                      <ProgressRing
                        value={100 - portfolioHealth.maintenance_rate}
                        size={100}
                        strokeWidth={8}
                        color="#8B5CF6"
                        showValue={false}
                        label="Maint."
                      />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{portfolioHealth.maintenance_rate}%</div>
                    <div className="text-sm text-gray-600">Maint. Rate</div>
                  </div>

                  <div className="text-center">
                    <div className="mb-3">
                      <ProgressRing
                        value={portfolioHealth.tenant_satisfaction}
                        size={100}
                        strokeWidth={8}
                        color="#F59E0B"
                        showValue={false}
                        label="Satisfaction"
                      />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{portfolioHealth.tenant_satisfaction}%</div>
                    <div className="text-sm text-gray-600">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Priority Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Priority Alerts</h2>
                  <p className="text-sm text-gray-600">{alerts.length} items requiring your attention</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {alerts.slice(0, 6).map((alert) => {
                const config = getAlertConfig(alert.type);
                const Icon = getAlertIcon(alert.category);

                return (
                  <button
                    key={alert.id}
                    onClick={() => navigate(alert.actionUrl)}
                    className={`w-full p-6 hover:bg-gray-50 transition text-left flex items-start gap-4`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.icon}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-bold text-gray-900">{alert.title}</h3>
                        {alert.value && (
                          <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                            {alert.value}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {alert.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(alert.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-blue-600 font-semibold">
                          <span>{alert.actionText || 'View Details'}</span>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {alerts.length > 6 && (
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
                  View all {alerts.length} alerts
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upsell for Free Users */}
        {isFree && (
          <UpgradeCard
            variant="banner"
            title="Unlock AI-Powered Features"
            description="Upgrade to Professional and access exclusive AI features that boost revenue by 15%"
            features={[
              { text: 'AI Rent Optimization', highlight: true },
              { text: 'Payment Risk Prediction', highlight: true },
              { text: 'Advanced Analytics' }
            ]}
            badge="LIMITED TIME OFFER"
            ctaText="Upgrade to Professional"
            ctaLink="/pricing"
          />
        )}

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Briefcase, label: 'Businesses', url: '/businesses', color: 'indigo' },
              { icon: Building2, label: 'Properties', url: '/properties', color: 'blue' },
              { icon: DoorClosed, label: 'Units', url: '/units', color: 'purple' },
              { icon: Users, label: 'Tenants', url: '/tenants', color: 'green' },
              { icon: DollarSign, label: 'Payments', url: '/payments', color: 'emerald' },
              { icon: Wrench, label: 'Maintenance', url: '/maintenance', color: 'amber' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.url)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition p-6 text-left border border-gray-100"
              >
                <div className={`w-12 h-12 bg-${action.color}-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{action.label}</h3>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useNavigate } from 'react-router-dom';
import { financialService } from '../services/financialService';
import { portfolioHealthService, PortfolioHealth } from '../services/portfolioHealthService';
import { paymentPredictionService, PaymentRiskScore } from '../services/paymentPredictionService';
import { leaseRenewalService, LeaseRenewalOpportunity } from '../services/leaseRenewalService';
import { Building2, Users, DollarSign, AlertCircle, TrendingUp, Wrench, Activity, AlertTriangle, Calendar, Clock } from 'lucide-react';

export function Dashboard() {
  const { currentOrganization } = useAuth();
  const { currentPortfolio } = usePortfolio();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [portfolioHealth, setPortfolioHealth] = useState<PortfolioHealth | null>(null);
  const [riskScores, setRiskScores] = useState<PaymentRiskScore[]>([]);
  const [renewalOpportunities, setRenewalOpportunities] = useState<LeaseRenewalOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [currentOrganization?.id, currentPortfolio?.id]);

  const loadDashboardData = async () => {
    const orgOrPortfolioId = currentOrganization?.id || currentPortfolio?.id;
    if (!orgOrPortfolioId) return;

    setIsLoading(true);
    try {
      const [summaryData, healthData, riskData, renewalData] = await Promise.all([
        financialService.getPortfolioSummary(orgOrPortfolioId),
        portfolioHealthService.calculateHealthScore(orgOrPortfolioId),
        paymentPredictionService.calculateTenantRiskScores(orgOrPortfolioId),
        leaseRenewalService.getExpiringLeases(orgOrPortfolioId, 90),
      ]);
      setSummary(summaryData);
      setPortfolioHealth(healthData);
      setRiskScores(riskData.filter(r => r.risk_level !== 'low').slice(0, 5));
      setRenewalOpportunities(renewalData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">{currentOrganization?.name || currentPortfolio?.name || 'My Portfolio'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {portfolioHealth && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Portfolio Health Score</h2>
                  <p className="text-blue-100">Real-time performance analysis</p>
                </div>
                <Activity size={40} className="text-blue-200" />
              </div>
              <div className="flex items-end gap-8">
                <div>
                  <div className="text-6xl font-bold mb-2">{portfolioHealth.health_score}</div>
                  <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${getHealthColor(portfolioHealth.health_level)}`}>
                    {portfolioHealth.health_level.toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-4 pb-2">
                  <div>
                    <div className="text-blue-200 text-sm mb-1">Occupancy</div>
                    <div className="text-2xl font-bold">{portfolioHealth.occupancy_rate}%</div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm mb-1">Collection</div>
                    <div className="text-2xl font-bold">{portfolioHealth.collection_rate}%</div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm mb-1">ROI</div>
                    <div className="text-2xl font-bold">{portfolioHealth.roi_percentage}%</div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm mb-1">Maintenance</div>
                    <div className="text-2xl font-bold">{portfolioHealth.metrics.open_maintenance}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            icon={Building2}
            title="Properties"
            value={summary?.totalProperties || 0}
            description="Total properties"
            isLoading={isLoading}
            color="blue"
          />
          <DashboardCard
            icon={Users}
            title="Tenants"
            value={summary?.totalTenants || 0}
            description="Active tenants"
            isLoading={isLoading}
            color="green"
          />
          <DashboardCard
            icon={DollarSign}
            title="Monthly Income"
            value={summary ? formatCurrency(summary.actualMonthlyIncome) : '$0'}
            description="Received this month"
            isLoading={isLoading}
            color="purple"
          />
          <DashboardCard
            icon={AlertCircle}
            title="Outstanding"
            value={summary ? formatCurrency(summary.outstandingPayments) : '$0'}
            description="Amount owed"
            isLoading={isLoading}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {riskScores.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl font-bold text-gray-900">Payment Risk Alerts</h2>
                </div>
                <div className="space-y-3">
                  {riskScores.map((risk) => (
                    <div
                      key={risk.tenant_id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{risk.tenant_name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {risk.late_payments} late out of {risk.total_payments} payments
                            {risk.outstanding_balance > 0 && (
                              <span className="ml-2 text-red-600 font-medium">
                                • Outstanding: {formatCurrency(risk.outstanding_balance)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 mb-1">{risk.risk_score}</div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getRiskColor(risk.risk_level)}`}>
                            {risk.risk_level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <strong>Recommendation:</strong> {risk.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renewalOpportunities.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl font-bold text-gray-900">Lease Renewals</h2>
                </div>
                <div className="space-y-3">
                  {renewalOpportunities.map((renewal) => (
                    <div
                      key={renewal.lease_id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{renewal.tenant_name}</div>
                          <div className="text-sm text-gray-600">{renewal.property_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock size={14} className={
                              renewal.priority === 'immediate' ? 'text-red-600' :
                              renewal.priority === 'high' ? 'text-orange-600' : 'text-yellow-600'
                            } />
                            <span className={`font-semibold ${
                              renewal.priority === 'immediate' ? 'text-red-600' :
                              renewal.priority === 'high' ? 'text-orange-600' : 'text-yellow-600'
                            }`}>
                              {renewal.days_until_expiry} days
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {renewal.renewal_probability}% likely to renew
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {formatCurrency(renewal.current_rent)} → {formatCurrency(renewal.suggested_rent)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {portfolioHealth && portfolioHealth.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Recommendations</h2>
                </div>
                <ul className="space-y-3">
                  {portfolioHealth.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-gray-700 flex-1">{rec}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/properties')}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Building2 size={18} />
                  Add Property
                </button>
                <button
                  onClick={() => navigate('/tenants')}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Users size={18} />
                  Add Tenant
                </button>
                <button
                  onClick={() => navigate('/payments')}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <DollarSign size={18} />
                  Record Payment
                </button>
                <button
                  onClick={() => navigate('/maintenance')}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Wrench size={18} />
                  New Maintenance
                </button>
              </div>
            </div>

            {portfolioHealth && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Key Metrics</h2>
                <div className="space-y-4">
                  <MetricItem
                    label="Properties"
                    value={portfolioHealth.metrics.total_properties}
                  />
                  <MetricItem
                    label="Occupancy"
                    value={`${portfolioHealth.metrics.occupied_units}/${portfolioHealth.metrics.total_units} units`}
                  />
                  <MetricItem
                    label="Late Payments"
                    value={`${portfolioHealth.metrics.late_payments}/${portfolioHealth.metrics.total_due_payments}`}
                    alert={portfolioHealth.metrics.late_payments > portfolioHealth.metrics.total_due_payments * 0.2}
                  />
                  <MetricItem
                    label="Open Maintenance"
                    value={portfolioHealth.metrics.open_maintenance}
                    alert={portfolioHealth.metrics.open_maintenance > 5}
                  />
                  <MetricItem
                    label="Avg Response Time"
                    value={`${portfolioHealth.metrics.avg_maintenance_response_days} days`}
                    alert={portfolioHealth.metrics.avg_maintenance_response_days > 3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  value,
  description,
  isLoading,
  color = 'blue',
}: {
  icon: any;
  title: string;
  value: string | number;
  description: string;
  isLoading?: boolean;
  color?: string;
}) {
  const colorClasses: any = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded mt-2 w-24 animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

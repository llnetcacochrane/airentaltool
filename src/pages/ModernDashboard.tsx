import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { financialService } from '../services/financialService';
import { portfolioHealthService, PortfolioHealth } from '../services/portfolioHealthService';
import { paymentPredictionService, PaymentRiskScore } from '../services/paymentPredictionService';
import { leaseRenewalService, LeaseRenewalOpportunity } from '../services/leaseRenewalService';
import {
  Building2, Users, DollarSign, AlertCircle, TrendingUp,
  Wrench, Activity, AlertTriangle, Calendar, ChevronRight,
  Home, CreditCard, FileText, Bell, Settings
} from 'lucide-react';

export function ModernDashboard() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [portfolioHealth, setPortfolioHealth] = useState<PortfolioHealth | null>(null);
  const [riskScores, setRiskScores] = useState<PaymentRiskScore[]>([]);
  const [renewalOpportunities, setRenewalOpportunities] = useState<LeaseRenewalOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [currentOrganization?.id]);

  const loadDashboardData = async () => {
    if (!currentOrganization) return;
    setIsLoading(true);
    try {
      const [summaryData, healthData, riskData, renewalData] = await Promise.all([
        financialService.getPortfolioSummary(currentOrganization.id),
        portfolioHealthService.calculateHealthScore(currentOrganization.id),
        paymentPredictionService.calculateTenantRiskScores(currentOrganization.id),
        leaseRenewalService.getExpiringLeases(currentOrganization.id, 90),
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent': return { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-100' };
      case 'good': return { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-100' };
      case 'fair': return { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-100' };
      case 'poor': return { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-100' };
      case 'critical': return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-100' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-600', ring: 'ring-gray-100' };
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
      case 'high': return 'bg-orange-100 text-orange-700 ring-1 ring-orange-200';
      case 'critical': return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      default: return 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const healthColors = portfolioHealth ? getHealthColor(portfolioHealth.health_level) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">{currentOrganization?.name}</p>
            </div>
            <button
              onClick={() => navigate('/properties')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Building2 size={18} />
              <span>View All Properties</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {portfolioHealth && (
          <div className={`relative overflow-hidden rounded-2xl ${healthColors?.bg} shadow-xl`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-8 h-8 text-white opacity-90" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Portfolio Health</h2>
                      <p className="text-white opacity-80 text-sm">Real-time performance</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="text-5xl sm:text-6xl font-bold text-white">{portfolioHealth.health_score}</div>
                    <div className="mb-2 px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full">
                      <span className="text-white text-sm font-semibold uppercase">
                        {portfolioHealth.health_level}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-white opacity-75 text-xs mb-1">Occupancy</p>
                    <p className="text-2xl font-bold text-white">{portfolioHealth.occupancy_rate}%</p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-white opacity-75 text-xs mb-1">Collection</p>
                    <p className="text-2xl font-bold text-white">{portfolioHealth.collection_rate}%</p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-white opacity-75 text-xs mb-1">Maint. Rate</p>
                    <p className="text-2xl font-bold text-white">{portfolioHealth.maintenance_rate}%</p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-white opacity-75 text-xs mb-1">Tenant Sat.</p>
                    <p className="text-2xl font-bold text-white">{portfolioHealth.tenant_satisfaction}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/properties')}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Properties</p>
            <p className="text-3xl font-bold text-gray-900">{summary?.total_properties || 0}</p>
          </button>

          <button
            onClick={() => navigate('/tenants')}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Active Tenants</p>
            <p className="text-3xl font-bold text-gray-900">{summary?.total_tenants || 0}</p>
          </button>

          <button
            onClick={() => navigate('/payments')}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(summary?.monthly_revenue || 0)}
            </p>
          </button>

          <button
            onClick={() => navigate('/maintenance')}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-red-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition">
                <Wrench className="w-6 h-6 text-red-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Open Requests</p>
            <p className="text-3xl font-bold text-gray-900">{summary?.open_maintenance || 0}</p>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {riskScores.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Payment Risks</h3>
                      <p className="text-sm text-gray-600">Tenants requiring attention</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/tenants')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View All
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {riskScores.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{risk.tenant_name}</p>
                        <p className="text-sm text-gray-600">{risk.unit_number}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadge(risk.risk_level)}`}>
                          {risk.risk_level.toUpperCase()}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">{risk.risk_score}% risk</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {renewalOpportunities.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Lease Renewals</h3>
                      <p className="text-sm text-gray-600">Expiring in 90 days</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/tenants')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View All
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {renewalOpportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{opportunity.tenant_name}</p>
                        <p className="text-sm text-gray-600">{opportunity.unit_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(opportunity.lease_end_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{opportunity.days_until_expiry} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Property Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/businesses')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Businesses</h3>
                <p className="text-sm text-gray-600">Manage business entities</p>
              </button>

              <button
                onClick={() => navigate('/properties')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                    <Home className="w-6 h-6 text-green-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Properties</h3>
                <p className="text-sm text-gray-600">View all properties & units</p>
              </button>

              <button
                onClick={() => navigate('/property-owners')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                    <Building2 className="w-6 h-6 text-amber-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Property Owners</h3>
                <p className="text-sm text-gray-600">Manage owner relationships</p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tenant Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/tenants')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Tenants</h3>
                <p className="text-sm text-gray-600">Manage tenant information</p>
              </button>

              <button
                onClick={() => navigate('/applications')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Applications</h3>
                <p className="text-sm text-gray-600">Review rental applications</p>
              </button>

              <button
                onClick={() => navigate('/maintenance')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-red-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition">
                    <Wrench className="w-6 h-6 text-red-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Maintenance</h3>
                <p className="text-sm text-gray-600">Track service requests</p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Financial Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/payments')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Payments</h3>
                <p className="text-sm text-gray-600">Track rent & payments</p>
              </button>

              <button
                onClick={() => navigate('/expenses')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                    <CreditCard className="w-6 h-6 text-amber-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Expenses</h3>
                <p className="text-sm text-gray-600">Manage operating costs</p>
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Reports</h3>
                <p className="text-sm text-gray-600">Financial analytics</p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Tools & Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/rent-optimization')}
                className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transition p-6 text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-white bg-opacity-20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-white opacity-75 group-hover:opacity-100 transition" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Rent Optimization</h3>
                <p className="text-sm text-white opacity-80">AI-powered pricing insights</p>
              </button>

              <button
                onClick={() => navigate('/addons')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                    <Building2 className="w-6 h-6 text-amber-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Add-Ons</h3>
                <p className="text-sm text-gray-600">Upgrade features & tools</p>
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-gray-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition">
                    <Settings className="w-6 h-6 text-gray-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Settings</h3>
                <p className="text-sm text-gray-600">Account configuration</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

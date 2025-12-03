import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useNavigate } from 'react-router-dom';
import { financialService } from '../services/financialService';
import { portfolioHealthService, PortfolioHealth } from '../services/portfolioHealthService';
import { paymentPredictionService, PaymentRiskScore } from '../services/paymentPredictionService';
import { leaseRenewalService, LeaseRenewalOpportunity } from '../services/leaseRenewalService';
import {
  AlertCircle, TrendingUp, Calendar, DollarSign, Wrench,
  ChevronRight, Building2, Home, Users, Bell, Clock, AlertTriangle
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'lease' | 'payment' | 'maintenance' | 'document';
  title: string;
  description: string;
  business?: string;
  property?: string;
  unit?: string;
  actionUrl: string;
  dueDate?: string;
}

export function OperationsCenter() {
  const { currentOrganization } = useAuth();
  const { currentPortfolio } = usePortfolio();
  const navigate = useNavigate();
  const [portfolioHealth, setPortfolioHealth] = useState<PortfolioHealth | null>(null);
  const [riskScores, setRiskScores] = useState<PaymentRiskScore[]>([]);
  const [renewalOpportunities, setRenewalOpportunities] = useState<LeaseRenewalOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadOperationsData();
  }, [currentOrganization?.id, currentPortfolio?.id]);

  const loadOperationsData = async () => {
    const orgOrPortfolioId = currentOrganization?.id || currentPortfolio?.id;
    if (!orgOrPortfolioId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [healthData, riskData, renewalData] = await Promise.all([
        portfolioHealthService.calculateHealthScore(orgOrPortfolioId),
        paymentPredictionService.calculateTenantRiskScores(orgOrPortfolioId),
        leaseRenewalService.getExpiringLeases(orgOrPortfolioId, 90),
      ]);

      setPortfolioHealth(healthData);
      setRiskScores(riskData.filter(r => r.risk_level !== 'low'));
      setRenewalOpportunities(renewalData);

      const generatedAlerts: Alert[] = [];

      renewalData.slice(0, 5).forEach((renewal) => {
        const daysUntil = renewal.days_until_expiry;
        generatedAlerts.push({
          id: `lease-${renewal.tenant_id}`,
          type: daysUntil <= 30 ? 'critical' : 'warning',
          category: 'lease',
          title: `Lease Expiring Soon`,
          description: `${renewal.tenant_name} - ${renewal.unit_number} expires in ${daysUntil} days`,
          actionUrl: `/tenants`,
          dueDate: renewal.lease_end_date,
        });
      });

      riskData.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').slice(0, 5).forEach((risk) => {
        generatedAlerts.push({
          id: `payment-${risk.tenant_id}`,
          type: risk.risk_level === 'critical' ? 'critical' : 'warning',
          category: 'payment',
          title: `Payment Risk - ${risk.risk_level.toUpperCase()}`,
          description: `${risk.tenant_name} - ${risk.unit_number} (${risk.risk_score}% risk)`,
          actionUrl: `/tenants`,
        });
      });

      setAlerts(generatedAlerts.sort((a, b) => {
        const priority = { critical: 3, warning: 2, info: 1 };
        return priority[b.type] - priority[a.type];
      }));

    } catch (err) {
      console.error('Failed to load operations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-900';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getAlertIcon = (category: string) => {
    switch (category) {
      case 'lease': return <Calendar className="w-5 h-5" />;
      case 'payment': return <DollarSign className="w-5 h-5" />;
      case 'maintenance': return <Wrench className="w-5 h-5" />;
      case 'document': return <AlertCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'from-emerald-500 to-emerald-600';
      case 'good': return 'from-blue-500 to-blue-600';
      case 'fair': return 'from-amber-500 to-amber-600';
      case 'poor': return 'from-orange-500 to-orange-600';
      case 'critical': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading operations center...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization && !currentPortfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Portfolio Found</h2>
          <p className="text-gray-600 mb-6">
            Setting up your account. Please wait...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Operations Center</h1>
              <p className="text-sm text-gray-600 mt-1">{currentOrganization?.name || currentPortfolio?.name || 'My Portfolio'}</p>
            </div>
            {alerts.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  {alerts.length} Item{alerts.length > 1 ? 's' : ''} Need Attention
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {portfolioHealth && (
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getHealthColor(portfolioHealth.health_level)} shadow-xl`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Portfolio Health Score</h2>
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

        {alerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Priority Alerts</h2>
                  <p className="text-sm text-gray-600">Items requiring immediate attention</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => navigate(alert.actionUrl)}
                  className={`w-full p-6 hover:bg-gray-50 transition text-left flex items-start gap-4 border-l-4 ${
                    alert.type === 'critical'
                      ? 'border-red-500'
                      : alert.type === 'warning'
                      ? 'border-amber-500'
                      : 'border-blue-500'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.type === 'critical'
                      ? 'bg-red-100 text-red-600'
                      : alert.type === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {getAlertIcon(alert.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{alert.title}</h3>
                        <p className="text-sm text-gray-600">{alert.description}</p>
                        {alert.dueDate && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <Clock size={12} />
                            <span>{new Date(alert.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Access</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">My Businesses</h3>
              <p className="text-sm text-gray-600">View all business entities</p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">All Properties</h3>
              <p className="text-sm text-gray-600">Browse all properties</p>
            </button>

            <button
              onClick={() => navigate('/tenants')}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">All Tenants</h3>
              <p className="text-sm text-gray-600">Manage all tenants</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

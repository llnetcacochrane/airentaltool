import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../services/superAdminService';
import { affiliateAdminService } from '../services/affiliateAdminService';
import { SuperAdminLayout } from '../components/SuperAdminLayout';
import type { Affiliate, AffiliatePayout, AffiliateSettings } from '../types';
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface AffiliateReport {
  total_affiliates: number;
  active_affiliates: number;
  pending_applications: number;
  total_referrals: number;
  total_conversions: number;
  total_commission_earned_cents: number;
  total_commission_paid_cents: number;
  pending_payouts_cents: number;
  pending_payouts_count: number;
}

export function AffiliateManagement() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'affiliates' | 'payouts' | 'settings'>('affiliates');

  // Data states
  const [report, setReport] = useState<AffiliateReport | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<AffiliatePayout[]>([]);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);

  // Filters
  const [affiliateFilter, setAffiliateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    program_active: true,
    commission_percentage: 2000,
    recurring_months: 12,
    minimum_payout_cents: 5000,
    cookie_duration_days: 30,
    require_approval: true,
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const isSuperAdmin = await superAdminService.isSuperAdmin();
      if (!isSuperAdmin) {
        navigate('/dashboard');
        return;
      }
      setIsAuthorized(true);
      await loadData();
    } catch (error) {
      console.error('Access check failed:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [reportData, affiliatesData, payoutsData, settingsData] = await Promise.all([
        affiliateAdminService.getReport(),
        affiliateAdminService.getAllAffiliates(),
        affiliateAdminService.getPendingPayouts(),
        affiliateAdminService.getSettings(),
      ]);

      setReport(reportData);
      setAffiliates(affiliatesData);
      setPendingPayouts(payoutsData);
      setSettings(settingsData);

      if (settingsData) {
        setSettingsForm({
          program_active: settingsData.program_active,
          commission_percentage: settingsData.commission_percentage,
          recurring_months: settingsData.recurring_months ?? 12,
          minimum_payout_cents: settingsData.minimum_payout_cents,
          cookie_duration_days: settingsData.cookie_duration_days,
          require_approval: settingsData.require_approval,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const formatCurrency = (cents: number) => {
    return affiliateAdminService.formatCurrency(cents);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Affiliate actions
  const handleAffiliateAction = async () => {
    if (!selectedAffiliate || !actionType) return;

    setIsSubmitting(true);
    try {
      switch (actionType) {
        case 'approve':
          await affiliateAdminService.approveAffiliate(selectedAffiliate.id);
          break;
        case 'reject':
          await affiliateAdminService.rejectAffiliate(selectedAffiliate.id, actionReason);
          break;
        case 'suspend':
          await affiliateAdminService.suspendAffiliate(selectedAffiliate.id, actionReason);
          break;
        case 'reactivate':
          await affiliateAdminService.reactivateAffiliate(selectedAffiliate.id);
          break;
      }

      await loadData();
      setSelectedAffiliate(null);
      setActionType(null);
      setActionReason('');
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payout actions
  const handlePayoutAction = async (payoutId: string, action: 'approve' | 'complete' | 'fail' | 'cancel') => {
    try {
      switch (action) {
        case 'approve':
          await affiliateAdminService.approvePayout(payoutId);
          break;
        case 'complete':
          const transactionId = prompt('Enter transaction ID:');
          if (transactionId) {
            await affiliateAdminService.completePayout(payoutId, transactionId);
          }
          break;
        case 'fail':
          const failReason = prompt('Enter failure reason:');
          if (failReason) {
            await affiliateAdminService.failPayout(payoutId, failReason);
          }
          break;
        case 'cancel':
          if (confirm('Are you sure you want to cancel this payout?')) {
            await affiliateAdminService.cancelPayout(payoutId);
          }
          break;
      }
      await loadData();
    } catch (error) {
      console.error('Payout action failed:', error);
      alert('Action failed. Please try again.');
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      await affiliateAdminService.updateSettings(settingsForm);
      alert('Settings saved successfully!');
      await loadData();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter affiliates
  const filteredAffiliates = affiliates.filter(a => {
    const matchesFilter = affiliateFilter === 'all' || a.status === affiliateFilter;
    const matchesSearch = !searchQuery ||
      a.referral_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.payout_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <SuperAdminLayout
      title="Affiliate Program Management"
      subtitle="Manage affiliates, payouts, and program settings"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            title="Total Affiliates"
            value={report?.total_affiliates || 0}
            subtitle={`${report?.active_affiliates || 0} active`}
            color="blue"
          />
          <StatCard
            icon={Clock}
            title="Pending Applications"
            value={report?.pending_applications || 0}
            subtitle="Awaiting review"
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            title="Total Conversions"
            value={report?.total_conversions || 0}
            subtitle={`${report?.total_referrals || 0} referrals`}
            color="green"
          />
          <StatCard
            icon={DollarSign}
            title="Total Commissions"
            value={formatCurrency(report?.total_commission_earned_cents || 0)}
            subtitle={`${formatCurrency(report?.total_commission_paid_cents || 0)} paid`}
            color="purple"
          />
        </div>

        {/* Pending Payouts Alert */}
        {(report?.pending_payouts_count || 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 font-semibold">
                {report?.pending_payouts_count} Pending Payout{report?.pending_payouts_count !== 1 ? 's' : ''}
              </p>
              <p className="text-amber-800 text-sm mt-1">
                Total: {formatCurrency(report?.pending_payouts_cents || 0)} awaiting processing.
                <button
                  onClick={() => setActiveTab('payouts')}
                  className="ml-2 text-amber-900 underline font-medium"
                >
                  Review now
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('affiliates')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'affiliates'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 inline-block mr-2" />
                Affiliates
              </button>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'payouts'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CreditCard className="w-4 h-4 inline-block mr-2" />
                Payouts
                {(report?.pending_payouts_count || 0) > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    {report?.pending_payouts_count}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'settings'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4 inline-block mr-2" />
                Settings
              </button>
            </nav>
          </div>

          {/* Affiliates Tab */}
          {activeTab === 'affiliates' && (
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by code, company, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={affiliateFilter}
                    onChange={(e) => setAffiliateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Affiliates Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Clicks</th>
                      <th className="px-4 py-3">Signups</th>
                      <th className="px-4 py-3">Earned</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAffiliates.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No affiliates found
                        </td>
                      </tr>
                    ) : (
                      filteredAffiliates.map((affiliate) => (
                        <tr key={affiliate.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-semibold text-green-600">
                              {affiliate.referral_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {affiliate.company_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {affiliate.payout_email || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={affiliate.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {affiliate.total_clicks || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {affiliate.total_signups || 0}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            {formatCurrency(affiliate.total_commission_earned_cents || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {affiliate.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedAffiliate(affiliate);
                                      setActionType('approve');
                                    }}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Approve"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAffiliate(affiliate);
                                      setActionType('reject');
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Reject"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {affiliate.status === 'approved' && (
                                <button
                                  onClick={() => {
                                    setSelectedAffiliate(affiliate);
                                    setActionType('suspend');
                                  }}
                                  className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                  title="Suspend"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              )}
                              {affiliate.status === 'suspended' && (
                                <button
                                  onClick={() => {
                                    setSelectedAffiliate(affiliate);
                                    setActionType('reactivate');
                                  }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Reactivate"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedAffiliate(affiliate);
                                  setActionType('view');
                                }}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Payouts</h3>

              {pendingPayouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>No pending payouts</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        <th className="px-4 py-3">Requested</th>
                        <th className="px-4 py-3">Affiliate</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Payout Email</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingPayouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(payout.requested_at)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="font-mono text-green-600">
                              {(payout as any).affiliate?.referral_code || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {formatCurrency(payout.amount_cents)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                            {payout.payout_method?.replace('_', ' ') || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {(payout as any).affiliate?.payout_email || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <PayoutStatusBadge status={payout.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {payout.status === 'pending' && (
                                <button
                                  onClick={() => handlePayoutAction(payout.id, 'approve')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                                >
                                  Approve
                                </button>
                              )}
                              {payout.status === 'approved' && (
                                <button
                                  onClick={() => handlePayoutAction(payout.id, 'complete')}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {['pending', 'approved'].includes(payout.status) && (
                                <>
                                  <button
                                    onClick={() => handlePayoutAction(payout.id, 'fail')}
                                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                                  >
                                    Failed
                                  </button>
                                  <button
                                    onClick={() => handlePayoutAction(payout.id, 'cancel')}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settingsForm.program_active}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, program_active: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Program Enabled</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">
                    Enable or disable the affiliate program entirely
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.commission_percentage / 100}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        commission_percentage: Math.round(parseFloat(e.target.value) * 100)
                      }))}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {(settingsForm.commission_percentage / 100).toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recurring Months
                    </label>
                    <input
                      type="number"
                      value={settingsForm.recurring_months}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        recurring_months: parseInt(e.target.value)
                      }))}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      How many months affiliates earn recurring commissions
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Payout ($)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.minimum_payout_cents / 100}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        minimum_payout_cents: Math.round(parseFloat(e.target.value) * 100)
                      }))}
                      step="1"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formatCurrency(settingsForm.minimum_payout_cents)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cookie Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.cookie_duration_days}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        cookie_duration_days: parseInt(e.target.value)
                      }))}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Attribution window for referral tracking
                    </p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settingsForm.require_approval}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, require_approval: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Require Approval for Applications</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">
                    New affiliate applications must be manually approved (recommended)
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Modal */}
        {selectedAffiliate && actionType && actionType !== 'view' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {actionType === 'approve' && 'Approve Affiliate'}
                {actionType === 'reject' && 'Reject Application'}
                {actionType === 'suspend' && 'Suspend Affiliate'}
                {actionType === 'reactivate' && 'Reactivate Affiliate'}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Affiliate: <span className="font-mono font-semibold text-green-600">{selectedAffiliate.referral_code}</span>
                {selectedAffiliate.company_name && ` (${selectedAffiliate.company_name})`}
              </p>

              {(actionType === 'reject' || actionType === 'suspend') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Enter reason..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedAffiliate(null);
                    setActionType(null);
                    setActionReason('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAffiliateAction}
                  disabled={isSubmitting || ((actionType === 'reject' || actionType === 'suspend') && !actionReason)}
                  className={`px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
                    actionType === 'approve' || actionType === 'reactivate'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedAffiliate && actionType === 'view' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Affiliate Details</h3>
                <button
                  onClick={() => {
                    setSelectedAffiliate(null);
                    setActionType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Referral Code</p>
                    <p className="font-mono font-semibold text-green-600">{selectedAffiliate.referral_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <StatusBadge status={selectedAffiliate.status} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-gray-900">{selectedAffiliate.company_name || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  <p className="text-gray-900">{selectedAffiliate.website_url || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Promotional Methods</p>
                  <p className="text-gray-900">{selectedAffiliate.promotional_methods || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Payout Method</p>
                    <p className="text-gray-900 capitalize">{selectedAffiliate.payout_method?.replace('_', ' ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payout Email</p>
                    <p className="text-gray-900">{selectedAffiliate.payout_email || '-'}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Clicks</p>
                      <p className="text-xl font-bold text-gray-900">{selectedAffiliate.total_clicks || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Signups</p>
                      <p className="text-xl font-bold text-gray-900">{selectedAffiliate.total_signups || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Paid Signups</p>
                      <p className="text-xl font-bold text-gray-900">{selectedAffiliate.total_paid_signups || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Commissions</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Earned</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(selectedAffiliate.total_commission_earned_cents || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Paid</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(selectedAffiliate.total_commission_paid_cents || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="text-lg font-bold text-amber-600">
                        {formatCurrency(selectedAffiliate.pending_commission_cents || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {(selectedAffiliate.rejection_reason || selectedAffiliate.suspension_reason) && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-red-500 font-medium">
                      {selectedAffiliate.rejection_reason ? 'Rejection Reason' : 'Suspension Reason'}
                    </p>
                    <p className="text-gray-900">
                      {selectedAffiliate.rejection_reason || selectedAffiliate.suspension_reason}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 border-t pt-4">
                  <div>
                    <p>Created: {formatDate(selectedAffiliate.created_at)}</p>
                  </div>
                  {selectedAffiliate.approved_at && (
                    <div>
                      <p>Approved: {formatDate(selectedAffiliate.approved_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: any;
  title: string;
  value: number | string;
  subtitle: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
    rejected: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default AffiliateManagement;

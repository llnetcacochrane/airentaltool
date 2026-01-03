import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { affiliateService } from '../../services/affiliateService';
import type { Affiliate, AffiliateStats, AffiliateReferral, AffiliateCommission, AffiliateSettings } from '../../types';
import {
  MousePointer,
  UserPlus,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Loader2,
  Users,
  CreditCard,
} from 'lucide-react';

interface OutletContext {
  affiliate: Affiliate;
}

export function AffiliateDashboard() {
  const { affiliate } = useOutletContext<OutletContext>();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [recentReferrals, setRecentReferrals] = useState<AffiliateReferral[]>([]);
  const [recentCommissions, setRecentCommissions] = useState<AffiliateCommission[]>([]);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsData, referralsData, commissionsData, settingsData] = await Promise.all([
          affiliateService.getStats(affiliate.id),
          affiliateService.getReferrals(affiliate.id, { limit: 5 }),
          affiliateService.getCommissions(affiliate.id, { limit: 5 }),
          affiliateService.getSettings(),
        ]);

        setStats(statsData);
        setRecentReferrals(referralsData);
        setRecentCommissions(commissionsData);
        setSettings(settingsData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [affiliate.id]);

  const copyReferralLink = () => {
    const url = affiliateService.getReferralUrl(affiliate.referral_code);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (cents: number) => {
    return affiliateService.formatCurrency(cents);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track your referrals, commissions, and earnings.
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Your Referral Link</h2>
              <p className="text-green-100 text-sm">
                Share this link to earn {settings ? `${(settings.commission_percentage / 100).toFixed(0)}%` : '20%'} commission on each referral.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                <code className="text-sm font-mono">
                  {affiliateService.getReferralUrl(affiliate.referral_code)}
                </code>
              </div>
              <button
                onClick={copyReferralLink}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                title="Copy link"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Clicks</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.total_clicks || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              This month: {stats?.this_month_clicks || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Signups</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.total_signups || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              This month: {stats?.this_month_signups || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.conversion_rate || 0}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Paid signups: {stats?.total_paid_signups || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Earned</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.total_commission_earned_cents || 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              This month: {formatCurrency(stats?.this_month_commission_cents || 0)}
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your Balance</h3>
              <div className="flex items-baseline gap-4 mt-2">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">
                    {formatCurrency(stats?.pending_commission_cents || 0)}
                  </p>
                  <p className="text-sm text-gray-500">Pending balance</p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-lg sm:text-xl font-semibold text-gray-700">
                    {formatCurrency(stats?.total_commission_paid_cents || 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total paid out</p>
                </div>
              </div>
            </div>
            {stats && settings && stats.pending_commission_cents >= settings.minimum_payout_cents && (
              <Link
                to="/affiliate-portal/payouts"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Request Payout
                <CreditCard className="w-4 h-4" />
              </Link>
            )}
          </div>
          {settings && (
            <p className="text-xs text-gray-500 mt-4">
              Minimum payout threshold: {formatCurrency(settings.minimum_payout_cents)}
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Referrals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Referrals</h3>
              <Link
                to="/affiliate-portal/referrals"
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentReferrals.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Share your link to start earning!</p>
                </div>
              ) : (
                recentReferrals.map((referral) => (
                  <div key={referral.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {referral.converted ? 'Converted Referral' : 'Click Tracked'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(referral.clicked_at)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      referral.converted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {referral.converted ? 'Converted' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Commissions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Commissions</h3>
              <Link
                to="/affiliate-portal/commissions"
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentCommissions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No commissions yet</p>
                  <p className="text-sm">Commissions are earned when referrals pay.</p>
                </div>
              ) : (
                recentCommissions.map((commission) => (
                  <div key={commission.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(commission.commission_amount_cents)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(commission.created_at)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      commission.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : commission.status === 'earned'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {commission.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AffiliateDashboard;

import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { affiliateService } from '../../services/affiliateService';
import type { Affiliate, AffiliateReferral } from '../../types';
import {
  Users,
  MousePointer,
  UserPlus,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface OutletContext {
  affiliate: Affiliate;
}

export function AffiliateReferrals() {
  const { affiliate } = useOutletContext<OutletContext>();
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'converted' | 'pending'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadReferrals();
  }, [affiliate.id, filter, page]);

  async function loadReferrals() {
    setIsLoading(true);
    try {
      const converted = filter === 'all' ? undefined : filter === 'converted';
      const data = await affiliateService.getReferrals(affiliate.id, {
        limit: limit + 1,
        offset: page * limit,
        converted,
      });

      setHasMore(data.length > limit);
      setReferrals(data.slice(0, limit));
    } catch (err) {
      console.error('Error loading referrals:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (cents: number) => {
    return affiliateService.formatCurrency(cents);
  };

  // Calculate stats
  const totalClicks = affiliate.total_clicks || 0;
  const totalSignups = affiliate.total_signups || 0;
  const totalPaidSignups = affiliate.total_paid_signups || 0;
  const conversionRate = totalClicks > 0 ? ((totalPaidSignups / totalClicks) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Referrals</h1>
          <p className="text-gray-600 mt-1">
            Track your referral clicks and conversions.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Clicks</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totalClicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Signups</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totalSignups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid Signups</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totalPaidSignups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setFilter('all'); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setFilter('converted'); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'converted'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Converted
              </button>
              <button
                onClick={() => { setFilter('pending'); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'pending'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Pending
              </button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No referrals found</p>
              <p className="text-sm text-gray-400 mt-1">
                Share your referral link to start earning commissions.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Clicked At</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Signup Date</th>
                      <th className="px-6 py-3">First Payment</th>
                      <th className="px-6 py-3">Landing Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {referrals.map((referral) => (
                      <tr key={referral.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(referral.clicked_at)}
                        </td>
                        <td className="px-6 py-4">
                          {referral.converted ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" />
                              Converted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {referral.signup_at ? formatDate(referral.signup_at) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {referral.first_payment_at ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(referral.first_payment_amount_cents || 0)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {referral.landing_page || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {page * limit + 1} - {page * limit + referrals.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AffiliateReferrals;

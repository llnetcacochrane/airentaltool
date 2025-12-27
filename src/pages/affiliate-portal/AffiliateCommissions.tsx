import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { affiliateService } from '../../services/affiliateService';
import type { Affiliate, AffiliateCommission } from '../../types';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface OutletContext {
  affiliate: Affiliate;
}

export function AffiliateCommissions() {
  const { affiliate } = useOutletContext<OutletContext>();
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'pending_payout' | 'paid'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadCommissions();
  }, [affiliate.id, filter, page]);

  async function loadCommissions() {
    setIsLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await affiliateService.getCommissions(affiliate.id, {
        limit: limit + 1,
        offset: page * limit,
        status,
      });

      setHasMore(data.length > limit);
      setCommissions(data.slice(0, limit));
    } catch (err) {
      console.error('Error loading commissions:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (cents: number) => {
    return affiliateService.formatCurrency(cents);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case 'earned':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            <DollarSign className="w-3 h-3" />
            Earned
          </span>
        );
      case 'pending_payout':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Pending Payout
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  // Calculate totals
  const totalEarned = affiliate.total_commission_earned_cents || 0;
  const totalPaid = affiliate.total_commission_paid_cents || 0;
  const pendingBalance = affiliate.pending_commission_cents || 0;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-600 mt-1">
            View your earned commissions and payment history.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Earned</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Balance</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(pendingBalance)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid Out</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
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
                onClick={() => { setFilter('earned'); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'earned'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Earned
              </button>
              <button
                onClick={() => { setFilter('pending_payout'); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'pending_payout'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Pending Payout
              </button>
              <button
                onClick={() => { setFilter('paid'); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No commissions found</p>
              <p className="text-sm text-gray-400 mt-1">
                Commissions are earned when your referrals make payments.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Billing Month</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Payment Amount</th>
                      <th className="px-6 py-3">Commission</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {commissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(commission.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {commission.billing_month}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                          {commission.commission_type.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(commission.payment_amount_cents)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                          {formatCurrency(commission.commission_amount_cents)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(commission.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {page * limit + 1} - {page * limit + commissions.length}
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

export default AffiliateCommissions;

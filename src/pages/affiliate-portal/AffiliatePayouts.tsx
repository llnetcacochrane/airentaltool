import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { affiliateService } from '../../services/affiliateService';
import type { Affiliate, AffiliatePayout, AffiliateSettings } from '../../types';
import {
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Send,
} from 'lucide-react';

interface OutletContext {
  affiliate: Affiliate;
}

export function AffiliatePayouts() {
  const { affiliate } = useOutletContext<OutletContext>();
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [affiliate.id, page]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [payoutsData, settingsData] = await Promise.all([
        affiliateService.getPayouts(affiliate.id, {
          limit: limit + 1,
          offset: page * limit,
        }),
        affiliateService.getSettings(),
      ]);

      setHasMore(payoutsData.length > limit);
      setPayouts(payoutsData.slice(0, limit));
      setSettings(settingsData);
    } catch (err) {
      console.error('Error loading payouts:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestPayout() {
    setIsRequesting(true);
    setError(null);
    setSuccess(null);

    try {
      await affiliateService.requestPayout(affiliate.id);
      setSuccess('Payout request submitted successfully! We will process it within 5-7 business days.');
      // Reload data to update the list
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to request payout. Please try again.');
    } finally {
      setIsRequesting(false);
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
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            <XCircle className="w-3 h-3" />
            Cancelled
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

  const pendingBalance = affiliate.pending_commission_cents || 0;
  const canRequestPayout = settings && pendingBalance >= settings.minimum_payout_cents;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-gray-600 mt-1">
            Request payouts and view your payout history.
          </p>
        </div>

        {/* Request Payout Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Available Balance</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(pendingBalance)}
              </p>
              {settings && (
                <p className="text-sm text-gray-500 mt-1">
                  Minimum payout: {formatCurrency(settings.minimum_payout_cents)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleRequestPayout}
                disabled={!canRequestPayout || isRequesting}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Request Payout
              </button>
              {!canRequestPayout && settings && (
                <p className="text-xs text-gray-500">
                  Need {formatCurrency(settings.minimum_payout_cents - pendingBalance)} more to request
                </p>
              )}
            </div>
          </div>

          {/* Payout Method Info */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Payout Method: {affiliate.payout_method?.replace('_', ' ').toUpperCase() || 'Not set'}
                </p>
                <p className="text-sm text-gray-500">
                  {affiliate.payout_email || 'No payout email configured'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No payouts yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Request your first payout when you reach the minimum threshold.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Requested</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Processed</th>
                      <th className="px-6 py-3">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(payout.requested_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(payout.amount_cents)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                          {payout.payout_method?.replace('_', ' ') || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payout.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {payout.processed_at ? formatDate(payout.processed_at) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {payout.transaction_id || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {page * limit + 1} - {page * limit + payouts.length}
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

export default AffiliatePayouts;

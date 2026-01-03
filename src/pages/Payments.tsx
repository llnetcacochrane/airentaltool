import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import { Payment } from '../types';
import { EmptyStatePresets } from '../components/EmptyState';
import { Plus, DollarSign, Calendar, CheckCircle, Clock, AlertCircle, Search, Filter, X } from 'lucide-react';
import { ExportButton } from '../components/ExportButton';
import { exportPayments } from '../utils/exportHelpers';
import { ExportFormat } from '../services/dataExportService';
import { AdvancedSearchFilter, useSearchAndFilter, FilterOption } from '../components/AdvancedSearchFilter';

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentBusiness } = useAuth();

  const filterConfig: FilterOption[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'pending', label: 'Pending' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      id: 'date',
      label: 'Payment Date',
      type: 'date-range',
    },
    {
      id: 'amount',
      label: 'Amount ($)',
      type: 'number-range',
      placeholder: 'Amount',
    },
  ];

  const {
    searchValue,
    setSearchValue,
    filterValues,
    setFilterValues,
    filteredItems: filteredPayments,
    clearFilters,
  } = useSearchAndFilter<Payment>(
    payments,
    ['payment_reference'] as (keyof Payment)[],
    (payment, filters) => {
      // Status filter
      if (filters.status && payment.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.date_from && payment.payment_date && payment.payment_date < filters.date_from) {
        return false;
      }
      if (filters.date_to && payment.payment_date && payment.payment_date > filters.date_to) {
        return false;
      }

      // Amount range filter
      const amount = (payment.amount_cents || 0) / 100;
      if (filters.amount_min && amount < parseFloat(filters.amount_min)) {
        return false;
      }
      if (filters.amount_max && amount > parseFloat(filters.amount_max)) {
        return false;
      }

      return true;
    }
  );

  useEffect(() => {
    loadPayments();
  }, [currentBusiness?.id]);

  const loadPayments = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const data = await paymentService.getPayments(currentBusiness.id);
      setPayments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalPaid = () => {
    return payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0);
  };

  const getPendingTotal = () => {
    return payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0);
  };

  const getOverdueTotal = () => {
    return payments
      .filter((p) => p.status === 'late')
      .reduce((sum, p) => sum + ((p.amount_cents || 0) / 100), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'overdue':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading payments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payments</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">{filteredPayments.length} total payments</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
              <ExportButton
                onExport={(format: ExportFormat) => exportPayments(filteredPayments, format)}
                disabled={filteredPayments.length === 0}
                variant="secondary"
                size="md"
              />
              <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex-1 sm:flex-initial whitespace-nowrap">
                <Plus size={20} className="flex-shrink-0" />
                <span className="hidden sm:inline">Record Payment</span>
                <span className="sm:hidden">Record</span>
              </button>
            </div>
          </div>

          <AdvancedSearchFilter
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search by reference number..."
            filters={filterConfig}
            filterValues={filterValues}
            onFilterChange={setFilterValues}
            onClearFilters={clearFilters}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Received</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(getTotalPaid())}</p>
                <p className="text-xs text-gray-500 mt-1">Completed payments</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{formatCurrency(getPendingTotal())}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(getOverdueTotal())}</p>
                <p className="text-xs text-gray-500 mt-1">Past due date</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-200" />
            </div>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          payments.length === 0 ? (
            EmptyStatePresets.Payments()
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching payments</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Method</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {payment.payment_reference || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {payment.payment_method?.replace('_', ' ') || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency((payment.amount_cents || 0) / 100)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {payment.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

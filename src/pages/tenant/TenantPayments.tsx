import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { tenantPortalService, TenantPayment, PaymentSummary } from '../../services/tenantPortalService';
import { PaymentModal } from '../../components/PaymentModal';
import {
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Banknote,
  Building,
  ArrowRight,
} from 'lucide-react';

export function TenantPayments() {
  const { tenantData } = useTenant();
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  useEffect(() => {
    if (tenantData) {
      loadPayments();
    }
  }, [tenantData]);

  const loadPayments = async () => {
    if (!tenantData) return;

    setIsLoading(true);
    try {
      const [paymentData, summaryData] = await Promise.all([
        tenantPortalService.getPaymentHistory(tenantData.tenant_id),
        tenantPortalService.getPaymentSummary(tenantData.tenant_id, tenantData.unit_id),
      ]);

      setPayments(paymentData);
      setPaymentSummary(summaryData);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rent: 'Monthly Rent',
      security_deposit: 'Security Deposit',
      pet_deposit: 'Pet Deposit',
      late_fee: 'Late Fee',
      utility: 'Utilities',
      maintenance: 'Maintenance',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const filteredPayments = payments.filter(payment => {
    const paymentYear = new Date(payment.due_date).getFullYear();
    return paymentYear === selectedYear;
  });

  const availableYears = [...new Set(payments.map(p => new Date(p.due_date).getFullYear()))].sort((a, b) => b - a);
  if (!availableYears.includes(new Date().getFullYear())) {
    availableYears.unshift(new Date().getFullYear());
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
              <p className="text-sm text-gray-600 mt-1">View and manage your rent payments</p>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <CreditCard className="w-5 h-5" />
              Make a Payment
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Cards */}
        {paymentSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Current Balance</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(paymentSummary.current_balance_cents)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Next Due Date</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {paymentSummary.next_due_date ? formatDate(paymentSummary.next_due_date) : 'None'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Paid This Year</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(paymentSummary.total_paid_this_year_cents)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm text-gray-500">Monthly Rent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {tenantData?.monthly_rent_cents ? formatCurrency(tenantData.monthly_rent_cents) : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Payment Alert */}
        {paymentSummary && paymentSummary.current_balance_cents > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Payment Due</h3>
                  <p className="text-sm text-amber-700">
                    You have an outstanding balance of {formatCurrency(paymentSummary.current_balance_cents)}
                    {paymentSummary.next_due_date && ` due by ${formatDate(paymentSummary.next_due_date)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition"
              >
                Pay Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-semibold text-gray-900">Payment History</h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
              <p className="text-gray-600">No payment records found for {selectedYear}.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="px-6 py-4">
                  <button
                    onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payment.status === 'paid' ? 'bg-green-100' :
                          payment.status === 'late' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          <CreditCard className={`w-5 h-5 ${
                            payment.status === 'paid' ? 'text-green-600' :
                            payment.status === 'late' ? 'text-red-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{getPaymentTypeLabel(payment.payment_type)}</p>
                          <p className="text-sm text-gray-500">Due: {formatDate(payment.due_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(payment.amount_cents)}</p>
                          {getStatusBadge(payment.status)}
                        </div>
                        {expandedPayment === payment.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {expandedPayment === payment.id && (
                    <div className="mt-4 pl-14 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Payment Date</p>
                        <p className="font-medium text-gray-900">
                          {payment.payment_date ? formatDate(payment.payment_date) : 'Not yet paid'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Payment Method</p>
                        <p className="font-medium text-gray-900">
                          {payment.payment_method || 'N/A'}
                        </p>
                      </div>
                      {payment.description && (
                        <div className="sm:col-span-2">
                          <p className="text-gray-500">Description</p>
                          <p className="font-medium text-gray-900">{payment.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Accepted Payment Methods</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Credit/Debit Card</p>
                <p className="text-xs text-gray-500">Visa, Mastercard, Amex</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Building className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Bank Transfer</p>
                <p className="text-xs text-gray-500">ACH Direct Debit</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Banknote className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-medium text-gray-900">Check</p>
                <p className="text-xs text-gray-500">Mail or in-person</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && tenantData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(paymentId, method) => {
            setShowPaymentModal(false);
            // Reload payments to show the new payment
            loadPayments();
          }}
          amountCents={paymentSummary?.current_balance_cents || 0}
          currency="USD"
          organizationId={tenantData.organization_id}
          tenantId={tenantData.tenant_id}
          leaseId={tenantData.lease_id || undefined}
          paymentType="rent"
          description={`Rent payment for ${tenantData.unit_name}`}
        />
      )}
    </div>
  );
}

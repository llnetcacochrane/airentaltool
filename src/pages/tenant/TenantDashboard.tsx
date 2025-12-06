import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { tenantPortalService, PaymentSummary, TenantMaintenanceRequest } from '../../services/tenantPortalService';
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Bell,
  ArrowRight,
  Building2,
  MapPin,
} from 'lucide-react';

export function TenantDashboard() {
  const { tenantData, isLoading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [recentMaintenance, setRecentMaintenance] = useState<TenantMaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenantData) {
      loadDashboardData();
      // Record portal login
      tenantPortalService.recordPortalLogin(tenantData.tenant_id);
    }
  }, [tenantData]);

  const loadDashboardData = async () => {
    if (!tenantData) return;

    setIsLoading(true);
    try {
      const [paymentData, maintenanceData] = await Promise.all([
        tenantPortalService.getPaymentSummary(tenantData.tenant_id, tenantData.unit_id),
        tenantPortalService.getMaintenanceRequests(tenantData.tenant_id),
      ]);

      setPaymentSummary(paymentData);
      setRecentMaintenance(maintenanceData.slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDue = () => {
    if (!paymentSummary?.next_due_date) return null;
    const dueDate = new Date(paymentSummary.next_due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilLeaseEnd = () => {
    if (!tenantData?.lease_end_date) return null;
    const endDate = new Date(tenantData.lease_end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Rental Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find an active rental associated with your account.
          </p>
          <Link
            to="/tenant-portal"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Go to Tenant Portal
          </Link>
        </div>
      </div>
    );
  }

  const daysUntilDue = getDaysUntilDue();
  const daysUntilLeaseEnd = getDaysUntilLeaseEnd();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {tenantData.tenant_first_name}!
          </h1>
          <div className="flex items-center gap-2 text-blue-100">
            <MapPin className="w-4 h-4" />
            <span>{tenantData.property_address}</span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Alert Cards */}
        {daysUntilDue !== null && daysUntilDue <= 7 && paymentSummary && (
          <div className={`rounded-xl p-4 sm:p-6 ${
            daysUntilDue <= 0 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  daysUntilDue <= 0 ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  <CreditCard className={`w-6 h-6 ${daysUntilDue <= 0 ? 'text-red-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${daysUntilDue <= 0 ? 'text-red-900' : 'text-amber-900'}`}>
                    {daysUntilDue <= 0 ? 'Payment Overdue' : 'Payment Due Soon'}
                  </h3>
                  <p className={`text-sm ${daysUntilDue <= 0 ? 'text-red-700' : 'text-amber-700'}`}>
                    {formatCurrency(paymentSummary.next_due_amount_cents)} due {daysUntilDue <= 0 ? 'now' : `in ${daysUntilDue} days`}
                  </p>
                </div>
              </div>
              <Link
                to="/my-rental/payments"
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                  daysUntilDue <= 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                Pay Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase font-medium">Monthly Rent</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {tenantData.monthly_rent_cents ? formatCurrency(tenantData.monthly_rent_cents) : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase font-medium">Current Balance</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {paymentSummary ? formatCurrency(paymentSummary.current_balance_cents) : '$0.00'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase font-medium">Next Due</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {paymentSummary?.next_due_date ? formatDate(paymentSummary.next_due_date) : 'No payment due'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase font-medium">Lease Ends</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {tenantData.lease_end_date ? formatDate(tenantData.lease_end_date) : 'Month-to-Month'}
            </p>
            {daysUntilLeaseEnd !== null && daysUntilLeaseEnd <= 60 && (
              <p className="text-sm text-amber-600 mt-1">
                {daysUntilLeaseEnd} days remaining
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/my-rental/payments"
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Make a Payment</h3>
            <p className="text-sm text-gray-600">Pay rent online securely</p>
          </Link>

          <Link
            to="/my-rental/maintenance"
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-green-200 transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                <Wrench className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Request Maintenance</h3>
            <p className="text-sm text-gray-600">Submit a repair request</p>
          </Link>

          <Link
            to="/my-rental/documents"
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-purple-200 transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">View Documents</h3>
            <p className="text-sm text-gray-600">Access lease & documents</p>
          </Link>

          <Link
            to="/my-rental/messages"
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-amber-200 transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Contact Manager</h3>
            <p className="text-sm text-gray-600">Send a message</p>
          </Link>
        </div>

        {/* Recent Maintenance Requests */}
        {recentMaintenance.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Maintenance Requests</h2>
              <Link
                to="/my-rental/maintenance"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentMaintenance.map((request) => (
                <div key={request.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.title}</p>
                      <p className="text-sm text-gray-500">{formatDate(request.submitted_at)}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Property Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your Rental Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Property</p>
                <p className="font-medium text-gray-900">{tenantData.property_name}</p>
                <p className="text-sm text-gray-600">{tenantData.property_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unit</p>
                <p className="font-medium text-gray-900">Unit {tenantData.unit_number}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lease Period</p>
                <p className="font-medium text-gray-900">
                  {tenantData.lease_start_date ? formatDate(tenantData.lease_start_date) : 'N/A'} - {tenantData.lease_end_date ? formatDate(tenantData.lease_end_date) : 'Ongoing'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Security Deposit Paid</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(tenantData.security_deposit_paid_cents)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Summary */}
        {paymentSummary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Summary (This Year)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(paymentSummary.total_paid_this_year_cents)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Paid</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {paymentSummary.payments_on_time}
                </p>
                <p className="text-sm text-gray-600 mt-1">On-Time Payments</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">
                  {paymentSummary.payments_late}
                </p>
                <p className="text-sm text-gray-600 mt-1">Late Payments</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { propertyOwnerService } from '../../services/propertyOwnerService';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface PaymentRecord {
  id: string;
  date: string;
  tenant: string;
  unit: string;
  amount: number;
  status: string;
}

export function OwnerReports() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [totals, setTotals] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
  });

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const ownerBusinesses = await propertyOwnerService.getPropertyOwnerBusinesses();

      if (ownerBusinesses.length > 0) {
        const businessId = (ownerBusinesses[0] as any).id;

        // SECURITY: Validate businessId format to prevent injection
        if (!businessId || typeof businessId !== 'string') {
          console.error('Invalid business ID');
          return;
        }

        // Get payments for the period
        const months = selectedPeriod === '12months' ? 12 : selectedPeriod === '6months' ? 6 : 3;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Query rent_payments through properties relationship
        // rent_payments uses organization_id, but we can join through the lease/unit/property chain
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('business_id', businessId);

        const propertyIds = properties?.map(p => p.id) || [];

        // Get units for these properties
        const { data: units } = propertyIds.length > 0 ? await supabase
          .from('units')
          .select('id')
          .in('property_id', propertyIds) : { data: [] };

        const unitIds = units?.map(u => u.id) || [];

        // Get rent payments for these units via tenants
        const { data: payments, error: paymentsError } = unitIds.length > 0 ? await supabase
          .from('rent_payments')
          .select(`
            id,
            amount_cents,
            payment_date,
            status,
            tenant_id,
            tenants (
              first_name,
              last_name,
              unit_id
            )
          `)
          .in('unit_id', unitIds)
          .gte('payment_date', startDate.toISOString().split('T')[0])
          .order('payment_date', { ascending: false }) : { data: [], error: null };

        if (paymentsError) {
          console.error('Error loading payments:', paymentsError);
        }

        // Get expenses for the period
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('id, amount_cents, expense_date, category')
          .eq('business_id', businessId)
          .gte('expense_date', startDate.toISOString().split('T')[0]);

        if (expensesError) {
          console.error('Error loading expenses:', expensesError);
        }

        // Calculate monthly data
        const monthlyMap = new Map<string, MonthlyData>();

        // Initialize months
        for (let i = 0; i < months; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          monthlyMap.set(monthKey, { month: monthName, income: 0, expenses: 0, net: 0 });
        }

        // Add income (convert cents to dollars)
        payments?.forEach(payment => {
          if (payment.status === 'paid') {
            const date = new Date(payment.payment_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const data = monthlyMap.get(monthKey);
            if (data) {
              data.income += (payment.amount_cents || 0) / 100;
            }
          }
        });

        // Add expenses (convert cents to dollars)
        expenses?.forEach(expense => {
          const date = new Date(expense.expense_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const data = monthlyMap.get(monthKey);
          if (data) {
            data.expenses += (expense.amount_cents || 0) / 100;
          }
        });

        // Calculate net
        monthlyMap.forEach(data => {
          data.net = data.income - data.expenses;
        });

        const sortedMonthlyData = Array.from(monthlyMap.values()).reverse();
        setMonthlyData(sortedMonthlyData);

        // Calculate totals
        const totalIncome = sortedMonthlyData.reduce((sum, m) => sum + m.income, 0);
        const totalExpenses = sortedMonthlyData.reduce((sum, m) => sum + m.expenses, 0);
        setTotals({
          totalIncome,
          totalExpenses,
          netIncome: totalIncome - totalExpenses,
        });

        // Build unit lookup map for displaying unit numbers
        const unitMap = new Map<string, string>();
        if (units) {
          const { data: unitDetails } = await supabase
            .from('units')
            .select('id, unit_number')
            .in('id', unitIds);
          unitDetails?.forEach(u => unitMap.set(u.id, u.unit_number));
        }

        // Recent payments (convert cents to dollars)
        const recentPaymentsList = (payments || []).slice(0, 10).map((p: any) => ({
          id: p.id,
          date: p.payment_date,
          tenant: p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : 'Unknown',
          unit: p.tenants?.unit_id ? (unitMap.get(p.tenants.unit_id) || 'N/A') : 'N/A',
          amount: (p.amount_cents || 0) / 100,
          status: p.status,
        }));
        setRecentPayments(recentPaymentsList);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">View income, expenses, and statements</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">${totals.totalIncome.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">
            From rent and other income
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600">${totals.totalExpenses.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">
            Maintenance, repairs, etc.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Net Income</p>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              totals.netIncome >= 0 ? 'bg-blue-100' : 'bg-orange-100'
            }`}>
              {totals.netIncome >= 0 ? (
                <TrendingUp className="w-5 h-5 text-blue-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-orange-600" />
              )}
            </div>
          </div>
          <p className={`text-3xl font-bold ${totals.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            ${totals.netIncome.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Income minus expenses
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown</h2>
        {monthlyData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No data available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Income</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Expenses</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{month.month}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">
                      ${month.income.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-red-600 font-medium">
                      ${month.expenses.toLocaleString()}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${
                      month.net >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      ${month.net.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
        {recentPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent payments
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tenant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Unit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{payment.tenant}</td>
                    <td className="py-3 px-4 text-gray-600">{payment.unit}</td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">
                      ${payment.amount.toLocaleString()}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
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

export default OwnerReports;

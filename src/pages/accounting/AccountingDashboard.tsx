import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { financialReportingService } from '../../services/financialReportingService';
import { journalService } from '../../services/journalService';
import { fiscalPeriodService } from '../../services/fiscalPeriodService';
import { glAccountService } from '../../services/glAccountService';
import { GLJournal, FiscalPeriod } from '../../types';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Building2,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  DollarSign,
  PieChart,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

interface DashboardMetrics {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
}

export function AccountingDashboard() {
  const { currentBusiness } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentJournals, setRecentJournals] = useState<GLJournal[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<FiscalPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasChartOfAccounts, setHasChartOfAccounts] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const today = new Date();
  const currentYear = today.getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfToday = today.toISOString().split('T')[0] ?? today.toISOString().slice(0, 10);

  useEffect(() => {
    loadDashboardData();
  }, [currentBusiness?.id]);

  const loadDashboardData = async () => {
    if (!currentBusiness?.id) return;
    const businessId = currentBusiness.id;
    setIsLoading(true);
    try {
      // Check if chart of accounts is initialized
      const hasCOA = await glAccountService.hasChartOfAccounts(businessId);
      setHasChartOfAccounts(hasCOA);

      if (!hasCOA) {
        setIsLoading(false);
        return;
      }

      // Load trial balance for current metrics
      const trialBalance = await financialReportingService.generateTrialBalance(
        businessId,
        endOfToday
      );

      // Calculate metrics from trial balance
      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      const rows = trialBalance.rows || trialBalance.accounts || [];
      for (const row of rows) {
        const debitCents = row.debit_cents ?? row.debit_balance_cents ?? 0;
        const creditCents = row.credit_cents ?? row.credit_balance_cents ?? 0;
        const balance = debitCents - creditCents;
        switch (row.account_type) {
          case 'asset':
            totalAssets += balance;
            break;
          case 'liability':
            totalLiabilities += Math.abs(balance);
            break;
          case 'equity':
            totalEquity += Math.abs(balance);
            break;
        }
      }

      // Load income statement for YTD revenue/expenses
      const incomeStatement = await financialReportingService.generateIncomeStatement(
        businessId,
        startOfYear,
        endOfToday
      );

      // Get bank accounts for cash balance
      const bankAccounts = await glAccountService.getBankAccounts(businessId);
      const cashBalance = bankAccounts.reduce((sum, acc) => sum + acc.current_balance_cents, 0);

      setMetrics({
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue: incomeStatement.revenue.total_cents,
        totalExpenses: incomeStatement.operating_expenses?.total_cents ?? incomeStatement.expenses.total_cents,
        netIncome: incomeStatement.net_income_cents,
        cashBalance,
      });

      // Load recent journals
      const journals = await journalService.getRecentJournals(businessId, 5);
      setRecentJournals(journals);

      // Load current fiscal period
      const period = await fiscalPeriodService.getCurrentOpenPeriod(businessId);
      setCurrentPeriod(period);

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeChartOfAccounts = async () => {
    if (!currentBusiness) return;
    setIsInitializing(true);
    try {
      await glAccountService.initializeChartOfAccounts(currentBusiness.id);
      await fiscalPeriodService.initializeFiscalPeriods(currentBusiness.id);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize accounting');
    } finally {
      setIsInitializing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const defaultStyle = { bg: 'bg-gray-100', text: 'text-gray-700' };
    const styles: Record<string, { bg: string; text: string }> = {
      draft: defaultStyle,
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      posted: { bg: 'bg-green-100', text: 'text-green-700' },
      void: { bg: 'bg-red-100', text: 'text-red-700' },
      reversed: { bg: 'bg-purple-100', text: 'text-purple-700' },
    };
    const style = styles[status] ?? defaultStyle;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading accounting dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasChartOfAccounts) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Set Up Accounting</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Initialize your chart of accounts to start tracking finances with double-entry
              bookkeeping. This will create industry-standard accounts for property management.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Wallet className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Asset Accounts</p>
                <p className="text-xs text-gray-500">Bank, receivables, prepaid</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Revenue Accounts</p>
                <p className="text-xs text-gray-500">Rent, fees, other income</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <TrendingDown className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Expense Accounts</p>
                <p className="text-xs text-gray-500">Maintenance, utilities, taxes</p>
              </div>
            </div>

            <button
              onClick={initializeChartOfAccounts}
              disabled={isInitializing}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Initialize Chart of Accounts
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Accounting</h1>
              <p className="text-gray-600 mt-1">Financial overview for {currentYear}</p>
            </div>
            <div className="flex items-center gap-3">
              {currentPeriod && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{currentPeriod.period_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Key Metrics */}
        {metrics && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Cash Balance</span>
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics.cashBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Bank accounts total</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Total Assets</span>
                  <Wallet className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics.totalAssets)}
                </p>
                <p className="text-xs text-gray-500 mt-1">All asset accounts</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">YTD Revenue</span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Year to date</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Net Income</span>
                  <PieChart className="w-5 h-5 text-purple-500" />
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.netIncome)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Revenue - Expenses</p>
              </div>
            </div>

            {/* Balance Sheet Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Sheet Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-700">Total Assets</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900">
                      {formatCurrency(metrics.totalAssets)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-red-500" />
                      <span className="text-gray-700">Total Liabilities</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900">
                      {formatCurrency(metrics.totalLiabilities)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-purple-500" />
                      <span className="text-gray-700">Total Equity</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900">
                      {formatCurrency(metrics.totalEquity + metrics.netIncome)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-500">
                      Assets = Liabilities + Equity
                    </span>
                    {Math.abs(metrics.totalAssets - (metrics.totalLiabilities + metrics.totalEquity + metrics.netIncome)) < 100 ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Balanced
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Out of balance
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Statement Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Total Revenue</span>
                    </div>
                    <span className="font-mono font-medium text-green-600">
                      {formatCurrency(metrics.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="w-5 h-5 text-orange-500" />
                      <span className="text-gray-700">Total Expenses</span>
                    </div>
                    <span className="font-mono font-medium text-orange-600">
                      {formatCurrency(metrics.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 bg-gray-50 -mx-6 px-6 rounded-b-lg">
                    <div className="flex items-center gap-3">
                      <PieChart className="w-5 h-5 text-purple-500" />
                      <span className="font-medium text-gray-900">Net Income</span>
                    </div>
                    <span className={`font-mono font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(metrics.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/accounting/chart-of-accounts"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
              >
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Chart of Accounts</p>
                  <p className="text-xs text-gray-500">Manage GL accounts</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
              </Link>

              <Link
                to="/accounting/journals"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
              >
                <FileText className="w-6 h-6 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Journal Entries</p>
                  <p className="text-xs text-gray-500">Record transactions</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition" />
              </Link>

              <Link
                to="/accounting/reports/trial-balance"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
              >
                <PieChart className="w-6 h-6 text-purple-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Trial Balance</p>
                  <p className="text-xs text-gray-500">View account balances</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition" />
              </Link>

              <Link
                to="/vendors"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
              >
                <Building2 className="w-6 h-6 text-orange-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Vendors</p>
                  <p className="text-xs text-gray-500">Manage suppliers</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition" />
              </Link>
            </div>
          </div>

          {/* Recent Journals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Journal Entries</h3>
              <Link
                to="/accounting/journals"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </Link>
            </div>
            {recentJournals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No journal entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJournals.map((journal) => (
                  <div
                    key={journal.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {journal.journal_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(journal.journal_date)} · {journal.memo || 'No memo'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-gray-900">
                        {formatCurrency(journal.total_debit_cents)}
                      </p>
                      {getStatusBadge(journal.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

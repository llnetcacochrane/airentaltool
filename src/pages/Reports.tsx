import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { financialService } from '../services/financialService';
import { paymentPredictionService, CashFlowForecast } from '../services/paymentPredictionService';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Download, Activity } from 'lucide-react';

export function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { currentBusiness } = useAuth();

  useEffect(() => {
    loadReports();
  }, [currentBusiness?.id]);

  const loadReports = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [summaryData, forecastData] = await Promise.all([
        financialService.getPortfolioSummary(currentBusiness.id),
        paymentPredictionService.forecastCashFlow(currentBusiness.id, 6),
      ]);
      setSummary(summaryData);
      setForecast(forecastData);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const calculateNetIncome = () => {
    if (!summary) return 0;
    return summary.actualMonthlyIncome - summary.totalExpenses;
  };

  const calculateROI = () => {
    if (!summary || summary.totalInvestment === 0) return 0;
    return ((calculateNetIncome() * 12) / summary.totalInvestment) * 100;
  };

  const calculateOccupancyRate = () => {
    if (!summary || summary.totalUnits === 0) return 0;
    return (summary.occupiedUnits / summary.totalUnits) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-gray-600 mt-1">Overview of your portfolio performance</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <Download size={20} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {summary ? formatCurrency(summary.totalMonthlyIncome) : '$0'}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-xs text-green-600 font-semibold">Expected monthly</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
              <TrendingDown className="w-8 h-8 text-red-200" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {summary ? formatCurrency(summary.totalExpenses) : '$0'}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500 font-semibold">Operating costs</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Net Income</p>
              <BarChart3 className="w-8 h-8 text-blue-200" />
            </div>
            <p className={`text-3xl font-bold ${calculateNetIncome() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(calculateNetIncome())}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500 font-semibold">Revenue - Expenses</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">ROI</p>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {calculateROI().toFixed(1)}%
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500 font-semibold">Return on investment</span>
            </div>
          </div>
        </div>

        {forecast.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">6-Month Cash Flow Forecast</h3>
              </div>
              <div className="text-sm text-gray-600">AI-Powered Prediction</div>
            </div>
            <CashFlowChart forecast={forecast} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Income vs Expenses</h3>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600">Last 6 months</span>
              </div>
            </div>
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>Chart visualization would go here</p>
              <p className="text-xs mt-2">Showing income and expense trends over time</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Portfolio Summary</h3>
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Total Properties</dt>
                <dd className="text-lg font-semibold text-gray-900">{summary?.totalProperties || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Total Units</dt>
                <dd className="text-lg font-semibold text-gray-900">{summary?.totalUnits || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Occupied Units</dt>
                <dd className="text-lg font-semibold text-gray-900">{summary?.occupiedUnits || 0}</dd>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <dt className="text-sm text-gray-600">Occupancy Rate</dt>
                <dd className="text-lg font-semibold text-green-600">{calculateOccupancyRate().toFixed(0)}%</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Active Tenants</dt>
                <dd className="text-lg font-semibold text-gray-900">{summary?.totalTenants || 0}</dd>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <dt className="text-sm text-gray-600">Collection Rate</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {summary?.totalMonthlyIncome > 0
                    ? ((summary.actualMonthlyIncome / summary.totalMonthlyIncome) * 100).toFixed(0)
                    : 0}%
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Property Performance</h3>
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>Property-by-property analysis</p>
              <p className="text-xs mt-2">Revenue, expenses, and occupancy rates per property</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Payment Analysis</h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">On-Time Payments</span>
                  <span className="text-sm font-bold text-green-700">0</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Late Payments</span>
                  <span className="text-sm font-bold text-yellow-700">0</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-yellow-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-600" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Outstanding</span>
                  <span className="text-sm font-bold text-red-700">
                    {summary ? formatCurrency(summary.outstandingPayments) : '$0'}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashFlowChart({ forecast }: { forecast: CashFlowForecast[] }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const maxValue = Math.max(
    ...forecast.map(f => Math.max(f.expected_income, f.expected_expenses))
  );

  return (
    <div className="space-y-4">
      {forecast.map((month, idx) => {
        const incomeWidth = (month.expected_income / maxValue) * 100;
        const expenseWidth = (month.expected_expenses / maxValue) * 100;
        const isPositive = month.net_cash_flow >= 0;

        return (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900 w-20">{month.month}</span>
              <div className="flex-1 mx-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 flex items-center justify-end pr-2"
                        style={{ width: `${incomeWidth}%` }}
                      >
                        {incomeWidth > 15 && (
                          <span className="text-xs font-semibold text-white">
                            {formatCurrency(month.expected_income)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {incomeWidth <= 15 && (
                    <span className="text-xs font-semibold text-gray-700 w-20 text-right">
                      {formatCurrency(month.expected_income)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 flex items-center justify-end pr-2"
                        style={{ width: `${expenseWidth}%` }}
                      >
                        {expenseWidth > 15 && (
                          <span className="text-xs font-semibold text-white">
                            {formatCurrency(month.expected_expenses)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {expenseWidth <= 15 && (
                    <span className="text-xs font-semibold text-gray-700 w-20 text-right">
                      {formatCurrency(month.expected_expenses)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right w-32">
                <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(month.net_cash_flow)}
                </div>
                <div className="text-xs text-gray-500">{month.confidence_level}% confidence</div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Expected Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600">Expected Expenses</span>
        </div>
        <div className="flex-1"></div>
        <span className="text-gray-600">Net Cash Flow</span>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { financialService } from '../services/financialService';
import { paymentPredictionService, CashFlowForecast } from '../services/paymentPredictionService';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Download, Activity, Lock, Crown, Sparkles, Check, ArrowRight } from 'lucide-react';

// Demo data for showcasing features to free users
const DEMO_SUMMARY = {
  totalMonthlyIncome: 12500,
  actualMonthlyIncome: 11250,
  totalExpenses: 3200,
  totalUnits: 8,
  occupiedUnits: 7,
  totalInvestment: 450000,
  totalProperties: 3,
  totalTenants: 7,
  outstandingPayments: 1250,
};

const DEMO_FORECAST = [
  { month: 'Jan', expectedIncome: 12500, expectedExpenses: 3200, netCashFlow: 9300 },
  { month: 'Feb', expectedIncome: 12500, expectedExpenses: 3400, netCashFlow: 9100 },
  { month: 'Mar', expectedIncome: 12500, expectedExpenses: 3100, netCashFlow: 9400 },
  { month: 'Apr', expectedIncome: 13000, expectedExpenses: 3300, netCashFlow: 9700 },
  { month: 'May', expectedIncome: 13000, expectedExpenses: 3200, netCashFlow: 9800 },
  { month: 'Jun', expectedIncome: 13500, expectedExpenses: 3500, netCashFlow: 10000 },
];

export function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { currentBusiness, hasFeature } = useAuth();
  const navigate = useNavigate();

  const hasAdvancedReporting = hasFeature('advanced_reporting');

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

  // Use demo data for preview if user doesn't have advanced reporting
  const displaySummary = hasAdvancedReporting ? summary : DEMO_SUMMARY;
  const displayForecast = hasAdvancedReporting ? forecast : DEMO_FORECAST;

  if (isLoading && hasAdvancedReporting) {
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

  // Calculate values using display data
  const calculateNetIncomeDisplay = () => {
    if (!displaySummary) return 0;
    return displaySummary.actualMonthlyIncome - displaySummary.totalExpenses;
  };

  const calculateROIDisplay = () => {
    if (!displaySummary || displaySummary.totalInvestment === 0) return 0;
    return ((calculateNetIncomeDisplay() * 12) / displaySummary.totalInvestment) * 100;
  };

  const calculateOccupancyRateDisplay = () => {
    if (!displaySummary || displaySummary.totalUnits === 0) return 0;
    return (displaySummary.occupiedUnits / displaySummary.totalUnits) * 100;
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Upsell Banner for locked feature */}
      {!hasAdvancedReporting && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-lg">Advanced Analytics Preview</h2>
                    <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                      DEMO DATA
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Unlock powerful financial insights, ROI calculations, cash flow forecasting, and exportable reports.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
                >
                  <Crown size={18} />
                  Upgrade to Unlock
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Overview of your portfolio performance</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
              <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <Download size={20} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Revenue</p>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {displaySummary ? formatCurrency(displaySummary.totalMonthlyIncome) : '$0'}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-xs text-green-600 font-semibold">Expected monthly</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Expenses</p>
              <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-200" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {displaySummary ? formatCurrency(displaySummary.totalExpenses) : '$0'}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500 font-semibold">Operating costs</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Net Income</p>
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${calculateNetIncomeDisplay() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(calculateNetIncomeDisplay())}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500 font-semibold">Revenue - Expenses</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">ROI</p>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {calculateROIDisplay().toFixed(1)}%
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500 font-semibold">Return on investment</span>
            </div>
          </div>
        </div>

        {forecast.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">6-Month Cash Flow Forecast</h3>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">AI-Powered Prediction</div>
            </div>
            <CashFlowChart forecast={forecast} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Income vs Expenses</h3>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="sm:hidden text-gray-400" />
                <Calendar size={18} className="hidden sm:block text-gray-400" />
                <span className="text-xs sm:text-sm text-gray-600">Last 6 months</span>
              </div>
            </div>
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm sm:text-base">Chart visualization would go here</p>
              <p className="text-xs mt-2">Showing income and expense trends over time</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Portfolio Summary</h3>
            <dl className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-xs sm:text-sm text-gray-600">Total Properties</dt>
                <dd className="text-base sm:text-lg font-semibold text-gray-900">{displaySummary?.totalProperties || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs sm:text-sm text-gray-600">Total Units</dt>
                <dd className="text-base sm:text-lg font-semibold text-gray-900">{displaySummary?.totalUnits || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs sm:text-sm text-gray-600">Occupied Units</dt>
                <dd className="text-base sm:text-lg font-semibold text-gray-900">{displaySummary?.occupiedUnits || 0}</dd>
              </div>
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200">
                <dt className="text-xs sm:text-sm text-gray-600">Occupancy Rate</dt>
                <dd className="text-base sm:text-lg font-semibold text-green-600">{calculateOccupancyRateDisplay().toFixed(0)}%</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs sm:text-sm text-gray-600">Active Tenants</dt>
                <dd className="text-base sm:text-lg font-semibold text-gray-900">{displaySummary?.totalTenants || 0}</dd>
              </div>
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200">
                <dt className="text-xs sm:text-sm text-gray-600">Collection Rate</dt>
                <dd className="text-base sm:text-lg font-semibold text-gray-900">
                  {displaySummary?.totalMonthlyIncome > 0
                    ? ((displaySummary.actualMonthlyIncome / displaySummary.totalMonthlyIncome) * 100).toFixed(0)
                    : 0}%
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Property Performance</h3>
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm sm:text-base">Property-by-property analysis</p>
              <p className="text-xs mt-2">Revenue, expenses, and occupancy rates per property</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Payment Analysis</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">On-Time Payments</span>
                  <span className="text-xs sm:text-sm font-bold text-green-700">0</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Late Payments</span>
                  <span className="text-xs sm:text-sm font-bold text-yellow-700">0</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-yellow-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-600" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Outstanding</span>
                  <span className="text-xs sm:text-sm font-bold text-red-700">
                    {displaySummary ? formatCurrency(displaySummary.outstandingPayments) : '$0'}
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
    <div className="space-y-3 sm:space-y-4">
      {forecast.map((month, idx) => {
        const incomeWidth = (month.expected_income / maxValue) * 100;
        const expenseWidth = (month.expected_expenses / maxValue) * 100;
        const isPositive = month.net_cash_flow >= 0;

        return (
          <div key={idx} className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-2 sm:gap-0">
              <span className="font-semibold text-gray-900 sm:w-20">{month.month}</span>
              <div className="flex-1 sm:mx-4 space-y-1.5">
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
              <div className="text-left sm:text-right sm:w-32">
                <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(month.net_cash_flow)}
                </div>
                <div className="text-xs text-gray-500">{month.confidence_level}% confidence</div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-200 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Expected Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600">Expected Expenses</span>
        </div>
        <div className="flex-1"></div>
        <span className="text-gray-600 hidden sm:inline">Net Cash Flow</span>
      </div>
    </div>
  );
}

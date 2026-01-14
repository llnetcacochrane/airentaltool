import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { journalService, JournalFilters } from '../../services/journalService';
import { GLJournal, JournalStatus, JournalType } from '../../types';
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Check,
  XCircle,
  Clock,
  RotateCcw,
  Eye,
  X,
  AlertCircle,
  Download,
} from 'lucide-react';
import { accountingExportService } from '../../services/accountingExportService';

export function JournalEntries() {
  const { currentBusiness, userProfile } = useAuth();
  const [journals, setJournals] = useState<GLJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JournalStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<JournalType | 'all'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedJournal, setSelectedJournal] = useState<GLJournal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<JournalStatus, number>>({
    draft: 0,
    pending_approval: 0,
    approved: 0,
    posted: 0,
    void: 0,
    reversed: 0,
  });

  useEffect(() => {
    loadJournals();
    loadStatusCounts();
  }, [currentBusiness?.id]);

  const loadJournals = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const filters: JournalFilters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.journalType = typeFilter;
      if (dateRange.start) filters.startDate = dateRange.start;
      if (dateRange.end) filters.endDate = dateRange.end;
      if (searchTerm) filters.searchTerm = searchTerm;

      const data = await journalService.getJournals(currentBusiness.id, filters);
      setJournals(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal entries');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatusCounts = async () => {
    if (!currentBusiness) return;
    try {
      const counts = await journalService.getJournalCountsByStatus(currentBusiness.id);
      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to load status counts:', err);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      loadJournals();
    }
  }, [statusFilter, typeFilter, dateRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJournals();
  };

  const handlePostJournal = async (journalId: string) => {
    if (!userProfile) return;
    try {
      await journalService.postJournal(journalId, userProfile.id);
      await loadJournals();
      await loadStatusCounts();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post journal');
    }
  };

  const handleVoidJournal = async (journalId: string) => {
    if (!userProfile) return;
    const reason = window.prompt('Enter reason for voiding this journal entry:');
    if (!reason) return;

    try {
      await journalService.voidJournal(journalId, userProfile.id, reason);
      await loadJournals();
      await loadStatusCounts();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void journal');
    }
  };

  const handleExport = async () => {
    if (!currentBusiness || !userProfile) return;
    try {
      const result = await accountingExportService.exportData(currentBusiness.id, userProfile.id, {
        format: 'generic_csv',
        exportType: 'journal_entries',
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      });
      accountingExportService.downloadFile(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export journals');
    }
  };

  const getStatusBadge = (status: JournalStatus) => {
    const styles: Record<JournalStatus, { bg: string; text: string; icon: JSX.Element }> = {
      draft: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        icon: <Clock className="w-3 h-3" />,
      },
      pending_approval: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <Clock className="w-3 h-3" />,
      },
      approved: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <Check className="w-3 h-3" />,
      },
      posted: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <Check className="w-3 h-3" />,
      },
      void: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <XCircle className="w-3 h-3" />,
      },
      reversed: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        icon: <RotateCcw className="w-3 h-3" />,
      },
    };

    const style = styles[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getTypeBadge = (type: JournalType) => {
    const typeLabels: Record<JournalType, string> = {
      general: 'General',
      sales: 'Sales',
      purchases: 'Purchases',
      cash_receipts: 'Cash Receipts',
      cash_payments: 'Cash Payments',
      payroll: 'Payroll',
      adjusting: 'Adjusting',
      closing: 'Closing',
      reversing: 'Reversing',
      opening: 'Opening',
    };

    return (
      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
        {typeLabels[type] || type}
      </span>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading journal entries...</p>
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
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Journal Entries</h1>
              <p className="text-gray-600 mt-1">Record and manage financial transactions</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">New Entry</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search journal number, memo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as JournalStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft ({statusCounts.draft})</option>
                <option value="pending_approval">Pending ({statusCounts.pending_approval})</option>
                <option value="posted">Posted ({statusCounts.posted})</option>
                <option value="void">Void ({statusCounts.void})</option>
                <option value="reversed">Reversed ({statusCounts.reversed})</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as JournalType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="cash_receipts">Cash Receipts</option>
                <option value="cash_payments">Cash Payments</option>
                <option value="adjusting">Adjusting</option>
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${statusFilter === 'draft' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Drafts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.draft}</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${statusFilter === 'pending_approval' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setStatusFilter(statusFilter === 'pending_approval' ? 'all' : 'pending_approval')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending_approval}</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${statusFilter === 'posted' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setStatusFilter(statusFilter === 'posted' ? 'all' : 'posted')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Posted</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{statusCounts.posted}</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${statusFilter === 'void' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setStatusFilter(statusFilter === 'void' ? 'all' : 'void')}
          >
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Voided</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{statusCounts.void}</p>
          </div>
          <div
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${statusFilter === 'reversed' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setStatusFilter(statusFilter === 'reversed' ? 'all' : 'reversed')}
          >
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Reversed</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{statusCounts.reversed}</p>
          </div>
        </div>

        {/* Journal Entries Table */}
        {journals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Journal Entries</h3>
            <p className="text-gray-600 mb-6">
              Create your first journal entry to start tracking financial transactions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Create Journal Entry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Journal #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Memo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((journal) => (
                    <tr
                      key={journal.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedJournal(journal)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {journal.journal_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDate(journal.journal_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getTypeBadge(journal.journal_type)}</td>
                      <td className="px-4 py-3">{getStatusBadge(journal.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {journal.memo || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-900">
                        {formatCurrency(journal.total_debit_cents)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-900">
                        {formatCurrency(journal.total_credit_cents)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedJournal(journal)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {journal.status === 'draft' && (
                            <button
                              onClick={() => handlePostJournal(journal.id)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Post journal"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {journal.status === 'posted' && (
                            <button
                              onClick={() => handleVoidJournal(journal.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Void journal"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Journal Detail Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Journal #{selectedJournal.journal_number}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(selectedJournal.journal_date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <p className="mt-1">{getTypeBadge(selectedJournal.journal_type)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p className="mt-1">{getStatusBadge(selectedJournal.status)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Currency</label>
                  <p className="mt-1 text-gray-900">{selectedJournal.transaction_currency}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Exchange Rate</label>
                  <p className="mt-1 text-gray-900">{selectedJournal.exchange_rate}</p>
                </div>
              </div>

              {selectedJournal.memo && (
                <div className="mb-6">
                  <label className="text-xs font-medium text-gray-500 uppercase">Memo</label>
                  <p className="mt-1 text-gray-900">{selectedJournal.memo}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                  Totals
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Total Debits</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(selectedJournal.total_debit_cents)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Total Credits</p>
                    <p className="text-2xl font-bold text-red-700">
                      {formatCurrency(selectedJournal.total_credit_cents)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedJournal.void_reason && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <label className="text-xs font-medium text-red-600 uppercase">Void Reason</label>
                  <p className="mt-1 text-red-800">{selectedJournal.void_reason}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                >
                  Close
                </button>
                {selectedJournal.status === 'draft' && (
                  <button
                    onClick={() => {
                      handlePostJournal(selectedJournal.id);
                      setSelectedJournal(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Post Journal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Journal Entry</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Journal entries are automatically created when you record payments and expenses.
              Manual journal entry creation form coming soon.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

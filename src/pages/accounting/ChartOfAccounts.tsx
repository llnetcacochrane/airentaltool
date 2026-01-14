import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { glAccountService, AccountNode } from '../../services/glAccountService';
import { GLAccount, GLAccountType } from '../../types';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  CreditCard,
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Settings,
  Edit2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

interface AccountRowProps {
  node: AccountNode;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (account: GLAccount) => void;
}

function AccountRow({ node, level, expandedIds, onToggle, onEdit }: AccountRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indent = level * 24;

  const getTypeIcon = (type: GLAccountType) => {
    switch (type) {
      case 'asset':
        return <Wallet className="w-4 h-4 text-blue-500" />;
      case 'liability':
        return <CreditCard className="w-4 h-4 text-red-500" />;
      case 'equity':
        return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'revenue':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'expense':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      default:
        return <Folder className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: GLAccountType) => {
    switch (type) {
      case 'asset':
        return 'bg-blue-100 text-blue-800';
      case 'liability':
        return 'bg-red-100 text-red-800';
      case 'equity':
        return 'bg-purple-100 text-purple-800';
      case 'revenue':
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 ${node.is_header_account ? 'bg-gray-50 font-semibold' : ''}`}>
        <td className="px-4 py-3" style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => onToggle(node.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-500" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500" />
              )
            ) : (
              getTypeIcon(node.account_type)
            )}
            <span className="font-mono text-sm text-gray-500">{node.account_number}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={node.is_header_account ? 'text-gray-900' : 'text-gray-700'}>
            {node.account_name}
          </span>
          {node.is_bank_account && (
            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
              Bank
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(node.account_type)}`}>
            {node.account_type}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono">
          {!node.is_header_account && formatCurrency(node.current_balance_cents)}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex px-2 py-1 rounded text-xs ${node.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {node.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {!node.is_system && (
            <button
              onClick={() => onEdit(node)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
      {isExpanded &&
        node.children.map((child) => (
          <AccountRow
            key={child.id}
            node={child}
            level={level + 1}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        ))}
    </>
  );
}

export function ChartOfAccounts() {
  const { currentBusiness } = useAuth();
  const [accounts, setAccounts] = useState<AccountNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [_editingAccount, setEditingAccount] = useState<GLAccount | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Note: _editingAccount is used by setEditingAccount for future edit modal implementation

  useEffect(() => {
    loadAccounts();
  }, [currentBusiness?.id]);

  const loadAccounts = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const hierarchy = await glAccountService.getAccountHierarchy(currentBusiness.id);
      setAccounts(hierarchy);

      // Auto-expand top level
      const topLevelIds = new Set(hierarchy.map((h) => h.id));
      setExpandedIds(topLevelIds);

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart of accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeChartOfAccounts = async () => {
    if (!currentBusiness) return;
    setIsInitializing(true);
    try {
      await glAccountService.initializeChartOfAccounts(currentBusiness.id);
      await loadAccounts();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize chart of accounts');
    } finally {
      setIsInitializing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const getAllIds = (nodes: AccountNode[]): string[] => {
      return nodes.flatMap((node) => [node.id, ...getAllIds(node.children)]);
    };
    setExpandedIds(new Set(getAllIds(accounts)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const filterAccounts = (nodes: AccountNode[]): AccountNode[] => {
    return nodes
      .map((node) => {
        const filteredChildren = filterAccounts(node.children);
        const matchesSearch =
          searchTerm === '' ||
          node.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.account_number.includes(searchTerm);
        const matchesType = typeFilter === 'all' || node.account_type === typeFilter;

        if (matchesSearch && matchesType) {
          return { ...node, children: filteredChildren };
        }
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter(Boolean) as AccountNode[];
  };

  const filteredAccounts = filterAccounts(accounts);

  const getTotalsByType = () => {
    const totals = {
      asset: 0,
      liability: 0,
      equity: 0,
      revenue: 0,
      expense: 0,
    };

    const sumAccounts = (nodes: AccountNode[]) => {
      for (const node of nodes) {
        if (!node.is_header_account && node.account_type in totals) {
          totals[node.account_type as keyof typeof totals] += node.current_balance_cents;
        }
        sumAccounts(node.children);
      }
    };

    sumAccounts(accounts);
    return totals;
  };

  const totals = getTotalsByType();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading chart of accounts...</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Chart of Accounts</h1>
              <p className="text-gray-600 mt-1">Manage your general ledger accounts</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Add Account</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="asset">Assets</option>
                <option value="liability">Liabilities</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expenses</option>
              </select>
              <button
                onClick={expandAll}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Collapse
              </button>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Assets</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totals.asset)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Liabilities</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totals.liability)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Equity</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totals.equity)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Revenue</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600">{formatCurrency(totals.revenue)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">Expenses</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-orange-600">{formatCurrency(totals.expense)}</p>
          </div>
        </div>

        {/* Chart of Accounts Table */}
        {filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chart of Accounts</h3>
            <p className="text-gray-600 mb-6">
              Initialize your chart of accounts with industry-standard property management accounts.
            </p>
            <button
              onClick={initializeChartOfAccounts}
              disabled={isInitializing}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Initializing...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Initialize Chart of Accounts
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Account #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Account Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((node) => (
                    <AccountRow
                      key={node.id}
                      node={node}
                      level={0}
                      expandedIds={expandedIds}
                      onToggle={toggleExpand}
                      onEdit={setEditingAccount}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Account Modal placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Account</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Account creation form would go here. For now, accounts are created automatically
              when you initialize the chart of accounts.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
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

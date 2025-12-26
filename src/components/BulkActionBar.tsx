import { Trash2, X, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  onClick: () => void | Promise<void>;
  confirmMessage?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  actions?: BulkAction[];
  onClearSelection: () => void;
  onSelectAll?: () => void;
  selectAllLabel?: string;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  actions = [],
  onClearSelection,
  onSelectAll,
  selectAllLabel = 'Select all',
}: BulkActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage) {
      if (!confirm(action.confirmMessage)) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      await action.onClick();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      default:
        return 'bg-gray-700 hover:bg-gray-800 text-white';
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slideInUp">
      <div className="bg-blue-600 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle size={20} />
          <span className="font-semibold">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
        </div>

        <div className="h-6 w-px bg-blue-400" />

        <div className="flex items-center gap-2">
          {onSelectAll && selectedCount < totalCount && (
            <button
              onClick={onSelectAll}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-400 rounded transition disabled:opacity-50"
            >
              {selectAllLabel} ({totalCount})
            </button>
          )}

          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isProcessing}
              className={`px-3 py-1.5 text-sm rounded transition flex items-center gap-1.5 disabled:opacity-50 ${getVariantClasses(
                action.variant
              )}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}

          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="p-1.5 hover:bg-blue-500 rounded transition disabled:opacity-50"
            title="Clear selection"
          >
            <X size={18} />
          </button>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Pre-configured bulk actions for common use cases
export const CommonBulkActions = {
  delete: (onDelete: () => void | Promise<void>): BulkAction => ({
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 size={16} />,
    variant: 'danger',
    onClick: onDelete,
    confirmMessage: 'Are you sure you want to delete the selected items? This action cannot be undone.',
  }),

  markCompleted: (onMarkCompleted: () => void | Promise<void>): BulkAction => ({
    id: 'mark-completed',
    label: 'Mark Complete',
    icon: <CheckCircle size={16} />,
    variant: 'success',
    onClick: onMarkCompleted,
  }),

  markPending: (onMarkPending: () => void | Promise<void>): BulkAction => ({
    id: 'mark-pending',
    label: 'Mark Pending',
    icon: <Clock size={16} />,
    variant: 'warning',
    onClick: onMarkPending,
  }),

  cancel: (onCancel: () => void | Promise<void>): BulkAction => ({
    id: 'cancel',
    label: 'Cancel',
    icon: <XCircle size={16} />,
    variant: 'danger',
    onClick: onCancel,
    confirmMessage: 'Are you sure you want to cancel the selected items?',
  }),
};

// Hook for managing bulk selection state
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id: string) => selectedIds.has(id);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected: selectedIds.size === items.length && items.length > 0,
    isSomeSelected: selectedIds.size > 0 && selectedIds.size < items.length,
  };
}

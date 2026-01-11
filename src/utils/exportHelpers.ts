/**
 * Export Helpers
 * Pre-configured export column definitions for common data types
 */

import { dataExportService, ExportFormat, ExportOptions } from '../services/dataExportService';
import type { Property, Tenant, Payment, Expense, MaintenanceRequest } from '../types';
import { getPropertyTypeLabel } from '../types';
import type { MaintenanceRequest as ServiceMaintenanceRequest } from '../services/maintenanceService';

/**
 * Export properties to file
 */
export function exportProperties(
  properties: Property[],
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  const columns = [
    { key: 'property_name', label: 'Property Name' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State/Province' },
    { key: 'postal_code', label: 'Postal Code' },
    { key: 'property_type', label: 'Type', format: (v: string) => v ? getPropertyTypeLabel(v) : 'N/A' },
    { key: 'bedrooms', label: 'Bedrooms' },
    { key: 'bathrooms', label: 'Bathrooms' },
    { key: 'square_feet', label: 'Square Feet' },
    { key: 'year_built', label: 'Year Built' },
    { key: 'status', label: 'Status', format: (v: string) => v?.toUpperCase() || 'N/A' },
    {
      key: 'purchase_price',
      label: 'Purchase Price',
      format: (v: number) => v ? `$${v.toLocaleString()}` : 'N/A',
    },
    {
      key: 'current_value',
      label: 'Current Value',
      format: (v: number) => v ? `$${v.toLocaleString()}` : 'N/A',
    },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
  ];

  dataExportService.export(properties, columns, {
    filename: `properties_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

/**
 * Export tenants to file
 */
export function exportTenants(
  tenants: Tenant[],
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  const columns = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    { key: 'status', label: 'Status', format: (v: string) => v?.toUpperCase() || 'N/A' },
    {
      key: 'move_in_date',
      label: 'Move In Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    {
      key: 'move_out_date',
      label: 'Move Out Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    { key: 'emergency_contact_name', label: 'Emergency Contact' },
    { key: 'emergency_contact_phone', label: 'Emergency Phone' },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
  ];

  dataExportService.export(tenants, columns, {
    filename: `tenants_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

/**
 * Export payments to file
 */
export function exportPayments(
  payments: Payment[],
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  const columns = [
    {
      key: 'payment_date',
      label: 'Payment Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    {
      key: 'due_date',
      label: 'Due Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    {
      key: 'amount',
      label: 'Amount',
      format: (v: number) => v ? `$${v.toFixed(2)}` : '$0.00',
    },
    { key: 'payment_type', label: 'Type', format: (v: string) => v?.toUpperCase() || 'N/A' },
    { key: 'payment_method', label: 'Method', format: (v: string) => v?.toUpperCase() || 'N/A' },
    { key: 'status', label: 'Status', format: (v: string) => v?.toUpperCase() || 'N/A' },
    { key: 'reference_number', label: 'Reference #' },
    { key: 'notes', label: 'Notes' },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
  ];

  dataExportService.export(payments, columns, {
    filename: `payments_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

/**
 * Export expenses to file
 */
export function exportExpenses(
  expenses: Expense[],
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  const columns = [
    {
      key: 'expense_date',
      label: 'Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    { key: 'category', label: 'Category', format: (v: string) => v?.toUpperCase() || 'N/A' },
    { key: 'description', label: 'Description' },
    {
      key: 'amount',
      label: 'Amount',
      format: (v: number) => v ? `$${v.toFixed(2)}` : '$0.00',
    },
    { key: 'vendor', label: 'Vendor' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'receipt_number', label: 'Receipt #' },
    {
      key: 'is_recurring',
      label: 'Recurring',
      format: (v: boolean) => v ? 'Yes' : 'No',
    },
    { key: 'notes', label: 'Notes' },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
  ];

  dataExportService.export(expenses, columns, {
    filename: `expenses_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

/**
 * Export maintenance requests to file
 * Accepts both MaintenanceRequest from types and from maintenanceService
 */
export function exportMaintenanceRequests(
  requests: (MaintenanceRequest | ServiceMaintenanceRequest)[],
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  const columns = [
    {
      key: 'created_at',
      label: 'Request Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category', format: (v: string) => v?.toUpperCase() || 'N/A' },
    { key: 'priority', label: 'Priority', format: (v: string) => v?.toUpperCase() || 'N/A' },
    { key: 'status', label: 'Status', format: (v: string) => v?.toUpperCase() || 'N/A' },
    {
      key: 'estimated_cost',
      label: 'Estimated Cost',
      format: (v: number) => v ? `$${v.toFixed(2)}` : 'N/A',
    },
    {
      key: 'actual_cost',
      label: 'Actual Cost',
      format: (v: number) => v ? `$${v.toFixed(2)}` : 'N/A',
    },
    {
      key: 'scheduled_date',
      label: 'Scheduled Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    {
      key: 'completed_date',
      label: 'Completed Date',
      format: (v: string) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'notes', label: 'Notes' },
  ];

  dataExportService.export(requests, columns, {
    filename: `maintenance_requests_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

/**
 * Export generic data with custom columns
 */
export function exportCustomData<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: string; label: string; format?: (value: any) => string }>,
  filename: string,
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  dataExportService.export(data, columns, {
    filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

/**
 * Generate monthly financial summary export
 */
export function exportFinancialSummary(
  data: {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    occupancyRate: number;
  }[],
  format: ExportFormat = 'csv',
  options: ExportOptions = {}
) {
  const columns = [
    { key: 'month', label: 'Month' },
    {
      key: 'totalIncome',
      label: 'Total Income',
      format: (v: number) => `$${v.toFixed(2)}`,
    },
    {
      key: 'totalExpenses',
      label: 'Total Expenses',
      format: (v: number) => `$${v.toFixed(2)}`,
    },
    {
      key: 'netIncome',
      label: 'Net Income',
      format: (v: number) => `$${v.toFixed(2)}`,
    },
    {
      key: 'occupancyRate',
      label: 'Occupancy Rate',
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
  ];

  dataExportService.export(data, columns, {
    filename: `financial_summary_${new Date().toISOString().split('T')[0]}`,
    format,
    ...options,
  });
}

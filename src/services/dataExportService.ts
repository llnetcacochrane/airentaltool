/**
 * Data Export Service
 * Provides functionality to export data in various formats (CSV, PDF, Excel-compatible CSV)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportFormat = 'csv' | 'pdf' | 'excel-csv' | 'json';

interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'us' | 'uk';
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter' | 'legal';
}

interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
  width?: number;
}

class DataExportService {
  /**
   * Export data to CSV format
   */
  exportToCSV<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export',
      includeHeaders = true,
      dateFormat = 'iso',
    } = options;

    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const rows: string[] = [];

    // Add headers
    if (includeHeaders) {
      const headers = columns.map(col => this.escapeCSVValue(col.label));
      rows.push(headers.join(','));
    }

    // Add data rows
    data.forEach(item => {
      const row = columns.map(col => {
        const value = item[col.key];
        const formatted = col.format
          ? col.format(value)
          : this.formatValue(value, dateFormat);
        return this.escapeCSVValue(formatted);
      });
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Export data to Excel-compatible CSV (UTF-8 with BOM)
   */
  exportToExcelCSV<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export',
      includeHeaders = true,
      dateFormat = 'iso',
    } = options;

    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const rows: string[] = [];

    // Add headers
    if (includeHeaders) {
      const headers = columns.map(col => this.escapeCSVValue(col.label));
      rows.push(headers.join(','));
    }

    // Add data rows
    data.forEach(item => {
      const row = columns.map(col => {
        const value = item[col.key];
        const formatted = col.format
          ? col.format(value)
          : this.formatValue(value, dateFormat);
        return this.escapeCSVValue(formatted);
      });
      rows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\n'); // BOM for Excel UTF-8
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Export data to PDF format
   */
  exportToPDF<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export',
      orientation = 'portrait',
      pageSize = 'a4',
      dateFormat = 'iso',
    } = options;

    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    });

    // Set document properties
    doc.setProperties({
      title: filename,
      subject: 'Data Export',
      author: 'AI Rental Tools',
      creator: 'AI Rental Tools',
    });

    // Prepare table data
    const headers = columns.map(col => col.label);
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key];
        const formatted = col.format
          ? col.format(value)
          : this.formatValue(value, dateFormat);
        return formatted;
      })
    );

    // Add title
    doc.setFontSize(16);
    doc.text(filename, 14, 15);

    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray
      },
      margin: { top: 28, right: 14, bottom: 14, left: 14 },
    });

    // Save the PDF
    doc.save(`${filename}.pdf`);
  }

  /**
   * Export data to JSON format
   */
  exportToJSON<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const { filename = 'export' } = options;

    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Filter data to only include specified columns
    const filteredData = data.map(item => {
      const filtered: Record<string, any> = {};
      columns.forEach(col => {
        filtered[col.key] = item[col.key];
      });
      return filtered;
    });

    const jsonContent = JSON.stringify(filteredData, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;');
  }

  /**
   * Export data in the specified format
   */
  export<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const format = options.format || 'csv';

    switch (format) {
      case 'csv':
        this.exportToCSV(data, columns, options);
        break;
      case 'excel-csv':
        this.exportToExcelCSV(data, columns, options);
        break;
      case 'pdf':
        this.exportToPDF(data, columns, options);
        break;
      case 'json':
        this.exportToJSON(data, columns, options);
        break;
      default:
        console.error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Escape CSV values to handle commas, quotes, and newlines
   */
  private escapeCSVValue(value: string): string {
    if (value == null) return '';

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Format value for export
   */
  private formatValue(value: any, dateFormat: 'iso' | 'us' | 'uk'): string {
    if (value == null) return '';

    // Handle dates
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      const date = value instanceof Date ? value : new Date(value);

      switch (dateFormat) {
        case 'us':
          return date.toLocaleDateString('en-US');
        case 'uk':
          return date.toLocaleDateString('en-GB');
        case 'iso':
        default:
          return date.toISOString().split('T')[0];
      }
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Handle numbers
    if (typeof value === 'number') {
      return value.toString();
    }

    // Handle objects/arrays
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Download file to user's computer
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// Export singleton instance
export const dataExportService = new DataExportService();

// Convenience exports
export const { export: exportData } = dataExportService;

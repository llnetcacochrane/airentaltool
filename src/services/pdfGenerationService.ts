import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFReportOptions {
  title: string;
  organizationName: string;
  period?: string;
  generatedDate: string;
}

export const pdfGenerationService = {
  async generateFinancialReport(
    summary: any,
    options: PDFReportOptions,
    aiSummary?: string
  ): Promise<Blob> {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text(options.title, 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    doc.text(options.organizationName, 105, yPosition, { align: 'center' });
    yPosition += 7;

    if (options.period) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(options.period, 105, yPosition, { align: 'center' });
      yPosition += 10;
    }

    doc.setFontSize(8);
    doc.text(`Generated: ${options.generatedDate}`, 105, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    if (aiSummary) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Executive Summary', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(60);
      const summaryLines = doc.splitTextToSize(aiSummary, 170);
      doc.text(summaryLines, 20, yPosition);
      yPosition += summaryLines.length * 5 + 10;

      doc.setDrawColor(200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Financial Overview', 20, yPosition);
    yPosition += 10;

    const overviewData = [
      ['Total Properties', summary.totalProperties?.toString() || '0'],
      ['Active Leases', summary.activeLeases?.toString() || '0'],
      ['Total Tenants', summary.totalTenants?.toString() || '0'],
      ['', ''],
      ['Expected Monthly Income', this.formatCurrency(summary.expectedMonthlyIncome || 0)],
      ['Actual Monthly Income', this.formatCurrency(summary.actualMonthlyIncome || 0)],
      ['Monthly Expenses', this.formatCurrency(summary.monthlyExpenses || 0)],
      ['Net Monthly Income', this.formatCurrency(summary.netMonthlyIncome || 0)],
      ['', ''],
      ['Collection Rate', `${summary.collectionRate?.toFixed(1) || 0}%`],
      ['Outstanding Payments', this.formatCurrency(summary.outstandingPayments || 0)],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: overviewData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', cellWidth: 70 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(10);
    doc.setTextColor(100);
    const footerText = 'This report is confidential and intended for internal use only.';
    doc.text(footerText, 105, 280, { align: 'center' });

    return doc.output('blob');
  },

  async generateExpenseReport(
    expenseData: any,
    options: PDFReportOptions,
    aiInsights?: string
  ): Promise<Blob> {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text(options.title, 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    doc.text(options.organizationName, 105, yPosition, { align: 'center' });
    yPosition += 7;

    if (options.period) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(options.period, 105, yPosition, { align: 'center' });
      yPosition += 10;
    }

    doc.setFontSize(8);
    doc.text(`Generated: ${options.generatedDate}`, 105, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    if (aiInsights) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('AI Insights', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(60);
      const insightsLines = doc.splitTextToSize(aiInsights, 170);
      doc.text(insightsLines, 20, yPosition);
      yPosition += insightsLines.length * 5 + 10;

      doc.setDrawColor(200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Expense Summary', 20, yPosition);
    yPosition += 5;

    doc.setFontSize(12);
    doc.text(`Total Expenses: ${this.formatCurrency(expenseData.total || 0)}`, 20, yPosition + 5);
    yPosition += 15;

    const categoryData = Object.entries(expenseData.byCategory || {})
      .sort(([, a]: any, [, b]: any) => b - a)
      .map(([category, amount]: any) => [
        category,
        this.formatCurrency(amount),
        `${((amount / expenseData.total) * 100).toFixed(1)}%`,
      ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount', '% of Total']],
      body: categoryData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 40 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    const footerText = 'This report is confidential and intended for internal use only.';
    doc.text(footerText, 105, 280, { align: 'center' });

    return doc.output('blob');
  },

  async generatePropertyReport(
    property: any,
    financials: any,
    options: PDFReportOptions
  ): Promise<Blob> {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(20);
    doc.text(options.title, 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(14);
    doc.text(property.name, 105, yPosition, { align: 'center' });
    yPosition += 7;

    if (property.address) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(property.address, 105, yPosition, { align: 'center' });
      yPosition += 10;
    }

    doc.setFontSize(8);
    doc.text(`Generated: ${options.generatedDate}`, 105, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Property Details', 20, yPosition);
    yPosition += 10;

    const propertyDetails = [
      ['Bedrooms', property.bedrooms?.toString() || 'N/A'],
      ['Bathrooms', property.bathrooms?.toString() || 'N/A'],
      ['Square Feet', property.square_feet?.toString() || 'N/A'],
      ['Type', property.type || 'N/A'],
      ['Year Built', property.year_built?.toString() || 'N/A'],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: propertyDetails,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 110 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (financials) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Financial Performance', 20, yPosition);
      yPosition += 10;

      const financialData = [
        ['Total Income', this.formatCurrency(financials.totalIncome || 0)],
        ['Total Expenses', this.formatCurrency(financials.totalExpenses || 0)],
        ['Net Income', this.formatCurrency(financials.netIncome || 0)],
      ];

      autoTable(doc, {
        startY: yPosition,
        body: financialData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 10, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'right', cellWidth: 70 },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      if (financials.leaseDetails && financials.leaseDetails.length > 0) {
        doc.setFontSize(14);
        doc.text('Lease Information', 20, yPosition);
        yPosition += 10;

        const leaseData = financials.leaseDetails.map((lease: any) => [
          lease.tenantName,
          this.formatCurrency(lease.monthlyRent),
          this.formatCurrency(lease.income),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Tenant', 'Monthly Rent', 'Period Income']],
          body: leaseData,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] },
          styles: { fontSize: 9 },
        });
      }
    }

    doc.setFontSize(10);
    doc.setTextColor(100);
    const footerText = 'This report is confidential and intended for internal use only.';
    doc.text(footerText, 105, 280, { align: 'center' });

    return doc.output('blob');
  },

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(value);
  },

  downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

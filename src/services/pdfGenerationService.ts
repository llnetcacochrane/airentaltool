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

  async generateAgreementPDF(agreement: any): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(22);
    doc.text(agreement.agreement_title, 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(agreement.agreement_type?.toUpperCase() || 'LEASE AGREEMENT', 105, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('PARTIES TO THE AGREEMENT', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text('Landlord:', 20, yPosition);
    yPosition += 5;
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`Name: ${agreement.landlord_name}`, 25, yPosition);
    yPosition += 5;
    doc.text(`Email: ${agreement.landlord_email}`, 25, yPosition);
    if (agreement.landlord_phone) {
      yPosition += 5;
      doc.text(`Phone: ${agreement.landlord_phone}`, 25, yPosition);
    }
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Tenant:', 20, yPosition);
    yPosition += 5;
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`Name: ${agreement.tenant_name}`, 25, yPosition);
    yPosition += 5;
    doc.text(`Email: ${agreement.tenant_email}`, 25, yPosition);
    if (agreement.tenant_phone) {
      yPosition += 5;
      doc.text(`Phone: ${agreement.tenant_phone}`, 25, yPosition);
    }
    yPosition += 15;

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('PROPERTY INFORMATION', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setTextColor(60);
    const addressLines = doc.splitTextToSize(`Address: ${agreement.property_address}`, 170);
    doc.text(addressLines, 20, yPosition);
    yPosition += addressLines.length * 5 + 3;

    if (agreement.property_description) {
      const descLines = doc.splitTextToSize(`Description: ${agreement.property_description}`, 170);
      doc.text(descLines, 20, yPosition);
      yPosition += descLines.length * 5 + 10;
    } else {
      yPosition += 10;
    }

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('LEASE TERMS', 20, yPosition);
    yPosition += 10;

    const leaseTermsData = [
      ['Lease Start Date', this.formatDate(agreement.start_date)],
      ['Lease End Date', this.formatDate(agreement.end_date)],
      ['Monthly Rent', this.formatCurrency(agreement.rent_amount)],
      ['Payment Frequency', agreement.payment_frequency],
      ['Payment Due Day', `Day ${agreement.payment_due_day} of each month`],
      ['Security Deposit', this.formatCurrency(agreement.security_deposit)],
    ];

    if (agreement.late_fee_amount) {
      leaseTermsData.push(['Late Fee', this.formatCurrency(agreement.late_fee_amount)]);
      leaseTermsData.push(['Grace Period', `${agreement.late_fee_grace_days} days`]);
    }

    autoTable(doc, {
      startY: yPosition,
      body: leaseTermsData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 100 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setDrawColor(200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('AGREEMENT DETAILS', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setTextColor(60);
    const agreementLines = doc.splitTextToSize(agreement.generated_text, 170);

    for (let i = 0; i < agreementLines.length; i++) {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(agreementLines[i], 20, yPosition);
      yPosition += 5;
    }

    if (agreement.status === 'executed' || agreement.tenant_signed || agreement.landlord_signed) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      } else {
        yPosition += 20;
      }

      doc.setDrawColor(200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('SIGNATURES', 20, yPosition);
      yPosition += 10;

      if (agreement.landlord_signed) {
        doc.setFontSize(10);
        doc.text('Landlord:', 20, yPosition);
        yPosition += 8;
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text(`Signed by: ${agreement.landlord_name}`, 25, yPosition);
        yPosition += 5;
        doc.text(`Date: ${this.formatDate(agreement.landlord_signed_at)}`, 25, yPosition);
        yPosition += 15;
      }

      if (agreement.tenant_signed) {
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Tenant:', 20, yPosition);
        yPosition += 8;
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text(`Signed by: ${agreement.tenant_name}`, 25, yPosition);
        yPosition += 5;
        doc.text(`Date: ${this.formatDate(agreement.tenant_signed_at)}`, 25, yPosition);
        yPosition += 10;
      }
    }

    const filename = `lease-agreement-${agreement.tenant_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = doc.output('blob');
    this.downloadPDF(blob, filename);
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
